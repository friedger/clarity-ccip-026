;; Title: CCIP-026 - MiamiCoin Burn to Exit
;; Version: 1.0.0
;; Summary: Governance proposal for CCIP-026 that allows MIA holders to vote
;;   on enabling the burn-to-exit redemption mechanism.
;; Description: Implements the proposal-trait for the CityCoins DAO. Voting
;;   power is verified via Merkle proofs against a snapshot of stacking balances.
;;   When the vote passes (yes > no) and is executed via ccd001-direct-execute,
;;   it enables the ccd013-burn-to-exit-mia extension and initializes redemptions.

;; TRAITS

(impl-trait 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.proposal-trait.proposal-trait)

;; ERRORS

(define-constant ERR_PANIC (err u26000)) ;; get-vote-totals returned none (should never happen)
(define-constant ERR_SAVING_VOTE (err u26001)) ;; map-insert for user-votes failed unexpectedly
(define-constant ERR_VOTED_ALREADY (err u26002)) ;; user already voted with the same boolean choice
(define-constant ERR_NOTHING_STACKED (err u26003)) ;; Merkle-verified vote amount is zero after scale-down
(define-constant ERR_USER_NOT_FOUND (err u26004)) ;; contract-caller not registered in ccd003-user-registry
(define-constant ERR_PROPOSAL_NOT_ACTIVE (err u26005)) ;; vote is inactive or current block is outside vote period
(define-constant ERR_VOTE_FAILED (err u26007)) ;; yes votes do not exceed no votes (execution rejected)
(define-constant ERR_PROOF_INVALID (err u26008)) ;; Merkle proof does not verify against snapshot root
(define-constant ERR_FOLD_FAILED (err u26009)) ;; internal Merkle proof fold step encountered unexpected none
(define-constant ERR_CONSENSUS_ENCODING_FAILED (err u26010)) ;; to-consensus-buff? returned none during leaf hashing

;; CONSTANTS

;; Proposal metadata
(define-constant CCIP_026 {
  name: "MiamiCoin Burn to Exit",
  link: "https://github.com/citycoins/governance/blob/d73c5d9bbd51f785454e60790b4b6be74d42d63d/ccips/ccip-026/ccip-026-miamicoin-burn-to-exit.md",
  hash: "d73c5d9bbd51f785454e60790b4b6be74d42d63d",
})

;; Vote amounts are stored as scaledVote / VOTE_SCALE_FACTOR to preserve
;; precision from the Merkle tree (which uses 16-decimal-place scaled values).
(define-constant VOTE_SCALE_FACTOR (pow u10 u16))
;; Voting window length: ~2 weeks in Bitcoin blocks
(define-constant VOTE_LENGTH u2016)

;; MERKLE VERIFICATION
;; Domain separation tags for tagged SHA-256 hashing, preventing second-preimage attacks.
;; Leaf:   SHA256("merkle-leaf"   || consensus(principal) || consensus(field-id) || consensus(amount))
;; Parent: SHA256("merkle-parent" || left || right)
(define-constant MERKLE_LEAF_TAG 0x6d65726b6c652d6c656166) ;; "merkle-leaf"
(define-constant MERKLE_PARENT_TAG 0x6d65726b6c652d706172656e74) ;; "merkle-parent"
;; Fixed index list driving the fold-based proof verification. Clarity lacks
;; dynamic iteration, so we pre-allocate the maximum proof depth of 9.
(define-constant PROOF_INDICES (list u0 u1 u2 u3 u4 u5 u6 u7 u8))

;; City ID for Miami, looked up from the on-chain registry (defaults to u1).
(define-constant MIA_ID (default-to u1
  (contract-call? 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd004-city-registry
    get-city-id "mia"
  )))

;; DATA VARS

;; Whether the vote is currently accepting ballots
(define-data-var vote-active bool true)
;; Bitcoin block height range for the voting window (set at deployment)
(define-data-var vote-start uint u0)
(define-data-var vote-end uint u0)
;; start the vote when deployed
(var-set vote-start burn-block-height)
(var-set vote-end (+ burn-block-height VOTE_LENGTH))

;; Merkle root of voter balance snapshots; must be set before any voting
(define-constant snapshot-merkle-root 0x776695e7e2659b4a92ed54d411456f244568e2572d8e8133fc0c2381c9d154b3)

;; DATA MAPS

;; Aggregated vote tallies per city ID. Tracks total MIA amounts and
;; vote counts for yes/no sides.
(define-map city-votes
  uint ;; city ID
  {
    total-amount-yes: uint, ;; cumulative MIA amount for yes votes
    total-amount-no: uint, ;; cumulative MIA amount for no votes
    total-votes-yes: uint, ;; number of yes voters
    total-votes-no: uint, ;; number of no voters
  }
)

;; Per-user vote record, keyed by user registry ID.
;; Stores the vote direction and the unscaled MIA amount.
(define-map user-votes
  uint ;; user ID (from ccd003-user-registry)
  {
    vote: bool, ;; true = yes, false = no
    mia: uint, ;; unscaled MIA vote amount (scaledVote / VOTE_SCALE_FACTOR)
  }
)

;; PUBLIC FUNCTIONS

;; Executes the proposal after the vote passes. Checks that yes > no,
;; deactivates voting, enables the ccd013 extension in the DAO, and
;; calls initialize-redemption to start the burn-to-exit mechanism.
;; Can only succeed via ccd001-direct-execute (DAO signers).
(define-public (execute (sender principal))
  (begin
    ;; check vote is complete/passed
    (try! (is-executable))
    ;; update vote variables
    (var-set vote-end burn-block-height)
    (var-set vote-active false)
    ;; enable new treasuries in the DAO
    (try! (contract-call? 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.base-dao
      set-extensions
      (list {
        extension: .ccd013-burn-to-exit-mia,
        enabled: true,
      })
    ))
    (try! (contract-call? .ccd013-burn-to-exit-mia initialize-redemption))
    (ok true)
  )
)

;; Cast or change a vote on the proposal.
;;
;; Two code paths:
;; 1. First-time voter: Merkle proof is verified against snapshot-merkle-root.
;;    The scaled-mia-vote-amount (amount * 10^16) is validated by the proof,
;;    then divided by VOTE_SCALE_FACTOR to store the actual MIA amount.
;; 2. Returning voter: If the vote direction changed, the existing record
;;    is updated and city vote tallies are adjusted (no proof needed).
;;
;; Parameters:
;;   vote                - true for yes, false for no
;;   scaled-mia-vote-amount - vote weight from Merkle tree (MIA * 10^16)
;;   proof               - list of sibling hashes for Merkle verification
;;   positions           - list of booleans; true = sibling is on the left
(define-public (vote-on-proposal
    (vote bool)
    (scaled-mia-vote-amount uint)
    (proof (list 9 (buff 32)))
    (positions (list 9 bool))
  )
  (let (
      (voter-id (unwrap!
        (contract-call?
          'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd003-user-registry
          get-user-id contract-caller
        )
        ERR_USER_NOT_FOUND
      ))
      (voter-record (map-get? user-votes voter-id))
    )
    ;; check if vote is active (use var directly like ccip022)
    (asserts! (var-get vote-active) ERR_PROPOSAL_NOT_ACTIVE)
    ;; check if within voting period
    (asserts!
      (and (>= burn-block-height (var-get vote-start)) (<= burn-block-height (var-get vote-end)))
      ERR_PROPOSAL_NOT_ACTIVE
    )
    ;; check if vote record exists for user
    (match voter-record
      record
      ;; if the voter-record exists
      (let (
          (old-vote (get vote record))
          (mia-vote-amount (get mia record))
        )
        ;; check vote is not the same as before
        (asserts! (not (is-eq old-vote vote)) ERR_VOTED_ALREADY)
        ;; record the new vote for the user
        (map-set user-votes voter-id (merge record { vote: vote }))
        ;; update vote stats for MIA
        (update-city-votes MIA_ID mia-vote-amount vote true)
      )
      ;; if the voter-record does not exist, verify merkle proof
      (let (
          (leaf (try! (hash-leaf contract-caller MIA_ID scaled-mia-vote-amount)))
          (verified (try! (verify-proof leaf proof positions snapshot-merkle-root)))
          (mia-vote-amount (scale-down scaled-mia-vote-amount))
        )
        ;; check merkle proof
        (asserts! verified ERR_PROOF_INVALID)
        ;; check that the user has a positive vote
        (asserts! (> mia-vote-amount u0) ERR_NOTHING_STACKED)
        ;; insert new user vote record
        (asserts!
          (map-insert user-votes voter-id {
            vote: vote,
            mia: mia-vote-amount,
          })
          ERR_SAVING_VOTE
        )
        ;; update vote stats for MIA
        (update-city-votes MIA_ID mia-vote-amount vote false)
      )
    )
    ;; print voter info
    (print {
      notification: "vote-on-ccip-026",
      payload: (get-voter-info voter-id),
    })
    (ok true)
  )
)

;; READ ONLY FUNCTIONS

;; Returns (ok true) if yes votes exceed no votes, otherwise ERR_VOTE_FAILED.
(define-read-only (is-executable)
  (let (
      (voting-record (unwrap! (get-vote-totals) ERR_PANIC))
      (vote-totals (get totals voting-record))
    )
    ;; check that the yes total is more than no total, implies that there is at least one vote
    (asserts!
      (> (get total-votes-yes vote-totals) (get total-votes-no vote-totals))
      ERR_VOTE_FAILED
    )
    ;; allow execution
    (ok true)
  )
)

;; Returns (some true) if voting is open and within the block window.
(define-read-only (is-vote-active)
  (some (and
    (var-get vote-active)
    (>= burn-block-height (var-get vote-start))
    (<= burn-block-height (var-get vote-end))
  ))
)

;; Returns the proposal metadata (name, link, hash).
(define-read-only (get-proposal-info)
  (some CCIP_026)
)

;; Returns the voting window: start block, end block, and length.
(define-read-only (get-vote-period)
  (some {
    start-block: (var-get vote-start),
    end-block: (var-get vote-end),
    length: VOTE_LENGTH,
  })
)

;; Returns the raw city-votes entry for MIA, or none if no votes yet.
(define-read-only (get-vote-total-mia)
  (map-get? city-votes MIA_ID)
)

;; Returns the city-votes entry for MIA with zeros as default.
(define-read-only (get-vote-total-mia-or-default)
  (default-to {
    total-amount-yes: u0,
    total-amount-no: u0,
    total-votes-yes: u0,
    total-votes-no: u0,
  }
    (get-vote-total-mia)
  )
)

;; Returns combined vote totals (mia record + aggregated totals).
(define-read-only (get-vote-totals)
  (let ((mia-record (get-vote-total-mia-or-default)))
    (some {
      mia: mia-record,
      totals: {
        total-amount-yes: (get total-amount-yes mia-record),
        total-amount-no: (get total-amount-no mia-record),
        total-votes-yes: (get total-votes-yes mia-record),
        total-votes-no: (get total-votes-no mia-record),
      },
    })
  )
)

;; Returns the vote record for a user by their registry ID, or none.
(define-read-only (get-voter-info (id uint))
  (map-get? user-votes id)
)

;; PRIVATE FUNCTIONS

;; Updates the city-votes map for a given city.
;; Four cases based on (vote, changed-vote):
;;   (true,  false) - new yes vote:     increment yes amount/count
;;   (false, false) - new no vote:      increment no amount/count
;;   (true,  true)  - changed to yes:   increment yes, decrement no
;;   (false, true)  - changed to no:    increment no, decrement yes
(define-private (update-city-votes
    (city-id uint)
    (vote-amount uint)
    (vote bool)
    (changed-vote bool)
  )
  (let ((city-record (default-to {
      total-amount-yes: u0,
      total-amount-no: u0,
      total-votes-yes: u0,
      total-votes-no: u0,
    }
      (map-get? city-votes city-id)
    )))
    ;; do not record if amount is 0
    (if (> vote-amount u0)
      ;; handle vote
      (if vote
        ;; handle yes vote
        (map-set city-votes city-id {
          total-amount-yes: (+ vote-amount (get total-amount-yes city-record)),
          total-votes-yes: (+ u1 (get total-votes-yes city-record)),
          total-amount-no: (if changed-vote
            (- (get total-amount-no city-record) vote-amount)
            (get total-amount-no city-record)
          ),
          total-votes-no: (if changed-vote
            (- (get total-votes-no city-record) u1)
            (get total-votes-no city-record)
          ),
        })
        ;; handle no vote
        (map-set city-votes city-id {
          total-amount-yes: (if changed-vote
            (- (get total-amount-yes city-record) vote-amount)
            (get total-amount-yes city-record)
          ),
          total-votes-yes: (if changed-vote
            (- (get total-votes-yes city-record) u1)
            (get total-votes-yes city-record)
          ),
          total-amount-no: (+ vote-amount (get total-amount-no city-record)),
          total-votes-no: (+ u1 (get total-votes-no city-record)),
        })
      )
      ;; ignore calls with vote amount equal to 0
      false
    )
  )
)

;; MERKLE VERIFICATION

;; Computes the leaf hash for Merkle proof verification:
;; SHA256("merkle-leaf" || consensus(principal) || consensus(field-id) || consensus(amount))
;; Uses SIP-005 consensus serialization (to-consensus-buff?) for each value.
(define-private (hash-leaf
    (account principal)
    (field-id uint)
    (amount uint)
  )
  (let (
      (principal-buf (try! (match (to-consensus-buff? account)
        p (ok p)
        ERR_CONSENSUS_ENCODING_FAILED
      )))
      (field-buf (try! (match (to-consensus-buff? field-id)
        p (ok p)
        ERR_CONSENSUS_ENCODING_FAILED
      )))
      (amount-buf (try! (match (to-consensus-buff? amount)
        p (ok p)
        ERR_CONSENSUS_ENCODING_FAILED
      )))
    )
    (ok (sha256 (concat MERKLE_LEAF_TAG (concat principal-buf (concat field-buf amount-buf)))))
  )
)

;; Computes a parent node: SHA256("merkle-parent" || left || right)
(define-private (hash-parent
    (left (buff 32))
    (right (buff 32))
  )
  (sha256 (concat MERKLE_PARENT_TAG (concat left right)))
)

;; Single step of the fold-based Merkle proof verification.
;; Combines the current hash with the sibling at index idx from the proof.
;; The positions list indicates whether the current node is the right child
;; (true = sibling is on the left).
(define-private (fold-proof-step-inner
    (idx uint)
    (acc (response {
      current: (optional (buff 32)),
      proof: (list 9 (buff 32)),
      positions: (list 9 bool),
    }
      uint
    ))
  )
  (let (
      (data (unwrap! acc ERR_FOLD_FAILED))
      (current (get current data))
      (proof (get proof data))
      (positions (get positions data))
    )
    (if (is-none current)
      (ok data)
      (if (>= idx (len proof))
        (ok data)
        (let (
            (current-buf (unwrap! current ERR_FOLD_FAILED))
            (proof-hash (unwrap! (element-at proof idx) ERR_FOLD_FAILED))
            (sibling-left (unwrap! (element-at positions idx) ERR_FOLD_FAILED))
            (parent (if sibling-left
              (hash-parent proof-hash current-buf)
              (hash-parent current-buf proof-hash)
            ))
          )
          (ok {
            current: (some parent),
            proof: proof,
            positions: positions,
          })
        )
      )
    )
  )
)

;; Verifies a Merkle proof by folding over PROOF_INDICES, then comparing
;; the computed root to expected-root. Returns (ok true) if they match.
(define-private (verify-proof
    (leaf (buff 32))
    (proof (list 9 (buff 32)))
    (positions (list 9 bool))
    (expected-root (buff 32))
  )
  (let (
      (initial {
        current: (some leaf),
        proof: proof,
        positions: positions,
      })
      (folded (try! (fold fold-proof-step-inner PROOF_INDICES (ok initial))))
      (computed-root (get current folded))
      (final-root (if (is-some computed-root)
        (try! (match computed-root
          r (ok r)
          ERR_FOLD_FAILED
        ))
        leaf
      ))
    )
    (ok (is-eq final-root expected-root))
  )
)

;; Converts a scaled vote amount back to actual MIA: a / 10^16
(define-private (scale-down (a uint))
  (/ a VOTE_SCALE_FACTOR)
)
