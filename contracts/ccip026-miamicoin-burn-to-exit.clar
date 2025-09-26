;; TRAITS

(impl-trait 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.proposal-trait.proposal-trait)
;; (impl-trait 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccip015-trait.ccip015-trait)

;; ERRORS

(define-constant ERR_PANIC (err u26000))
(define-constant ERR_SAVING_VOTE (err u26001))
(define-constant ERR_VOTED_ALREADY (err u26002))
(define-constant ERR_NOTHING_STACKED (err u26003))
(define-constant ERR_USER_NOT_FOUND (err u26004))
(define-constant ERR_PROPOSAL_NOT_ACTIVE (err u26005))
(define-constant ERR_PROPOSAL_STILL_ACTIVE (err u26006))
(define-constant ERR_VOTE_FAILED (err u26007))

;; CONSTANTS

(define-constant SELF (as-contract tx-sender))
(define-constant CCIP_026 {
  name: "MiamiCoin Burn to Exit",
  link: "https://github.com/citycoins/governance/blob/eea941ea40c16428b4806d1808e7dab9fc095e0a/ccips/ccip-026/ccip-026-miamicoin-burn-to-exit.md",
  hash: "",
})

(define-constant VOTE_SCALE_FACTOR (pow u10 u16)) ;; 16 decimal places
(define-constant VOTE_LENGTH u2016) ;; approximately 2 weeks in Bitcoin blocks

;; set city ID
(define-constant MIA_ID (default-to u1
  (contract-call? 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd004-city-registry
    get-city-id "mia"
  )))

;; DATA VARS

(define-data-var voteActive bool true)
(define-data-var voteStart uint u0)
(define-data-var voteEnd uint u0)
;; start the vote when deployed
(var-set voteStart burn-block-height)
(var-set voteEnd (+ burn-block-height VOTE_LENGTH))
;; DATA MAPS

(define-map CityVotes
  uint ;; city ID
  {
    ;; vote
    totalAmountYes: uint,
    totalAmountNo: uint,
    totalVotesYes: uint,
    totalVotesNo: uint,
  }
)

(define-map UserVotes
  uint ;; user ID
  {
    ;; vote
    vote: bool,
    mia: uint,
  }
)

;; PUBLIC FUNCTIONS

(define-public (execute (sender principal))
  (begin
    ;; check vote is complete/passed
    (try! (is-executable))
    ;; update vote variables
    (var-set voteEnd stacks-block-height)
    (var-set voteActive false)
    ;; enable new treasuries in the DAO
    (try! (contract-call? 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.base-dao
      set-extensions
      (list
        {
          extension: .ccd013-burn-to-exit-mia,
          enabled: true,
        }
      )))
    (try! (contract-call? .ccd013-burn-to-exit-mia initialize))
    (ok true)
  )
)

(define-public (vote-on-proposal (vote bool))
  (let (
      (voterId (unwrap!
        (contract-call?
          'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd003-user-registry
          get-user-id contract-caller
        )
        ERR_USER_NOT_FOUND
      ))
      (voterRecord (map-get? UserVotes voterId))
    )
    ;; check if vote is active
    (asserts! (is-vote-active) ERR_PROPOSAL_NOT_ACTIVE)
    ;; check if vote record exists for user
    (match voterRecord
      record
      ;; if the voterRecord exists
      (let (
          (oldVote (get vote record))
          (miaVoteAmount (get mia record))
        )
        ;; check vote is not the same as before
        (asserts! (not (is-eq oldVote vote)) ERR_VOTED_ALREADY)
        ;; record the new vote for the user
        (map-set UserVotes voterId (merge record { vote: vote }))
        ;; update vote stats for MIA
        (update-city-votes MIA_ID miaVoteAmount vote true)
      )
      ;; if the voterRecord does not exist
      (let ((miaVoteAmount (scale-down (default-to u0 (get-mia-vote voterId true)))))
        ;; check that the user has a positive vote
        (asserts! (> miaVoteAmount u0) ERR_NOTHING_STACKED)
        ;; insert new user vote record
        (asserts!
          (map-insert UserVotes voterId {
            vote: vote,
            mia: miaVoteAmount,
          })
          ERR_SAVING_VOTE
        )
        ;; update vote stats for MIA
        (update-city-votes MIA_ID miaVoteAmount vote false)
      )
    )
    ;; print voter info
    (print {
      notification: "vote-on-ccip-026",
      payload: (get-voter-info voterId),
    })
    (ok true)
  )
)

;; READ ONLY FUNCTIONS

;; READ ONLY FUNCTIONS
(define-read-only (is-executable)
  (let (
      (votingRecord (unwrap! (get-vote-totals) ERR_PANIC))
      (voteTotals (get totals votingRecord))
    )
    ;; check that the yes total is more than no total, implies that there is at least one vote
    (asserts! (> (get totalVotesYes voteTotals) (get totalVotesNo voteTotals))
      ERR_VOTE_FAILED
    )
    ;; allow execution
    (ok true)
  )
)

(define-read-only (is-vote-active)
  (if (and (>= burn-block-height (var-get voteStart)) (<= burn-block-height (var-get voteEnd)))
    true
    false
  )
)

(define-read-only (get-proposal-info)
  (some CCIP_026)
)

(define-read-only (get-vote-period)
  (some {
    startBlock: (var-get voteStart),
    endBlock: (var-get voteEnd),
    length: VOTE_LENGTH,
  })
)

(define-read-only (get-vote-total-mia)
  (map-get? CityVotes MIA_ID)
)

(define-read-only (get-vote-total-mia-or-default)
  (default-to {
    totalAmountYes: u0,
    totalAmountNo: u0,
    totalVotesYes: u0,
    totalVotesNo: u0,
  }
    (get-vote-total-mia)
  )
)

(define-read-only (get-vote-totals)
  (let ((miaRecord (get-vote-total-mia-or-default)))
    (some {
      mia: miaRecord,
      totals: {
        totalAmountYes: (get totalAmountYes miaRecord),
        totalAmountNo: (get totalAmountNo miaRecord),
        totalVotesYes: (get totalVotesYes miaRecord),
        totalVotesNo: (get totalVotesNo miaRecord),
      },
    })
  )
)

(define-read-only (get-voter-info (id uint))
  (map-get? UserVotes id)
)

;; MIA vote calculation
;; returns (some uint) or (none)
;; optionally scaled by VOTE_SCALE_FACTOR (10^6)
(define-read-only (get-mia-vote
    (userId uint)
    (scaled bool)
  )
  (let (
      ;; MAINNET: MIA cycle 82 / first block BTC 838,250 STX 145,643
      (cycle82Hash (unwrap! (get-block-hash u145643) none))
      (cycle82Data (at-block cycle82Hash
        (contract-call?
          'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd007-citycoin-stacking
          get-stacker MIA_ID u82 userId
        )))
      (cycle82Amount (get stacked cycle82Data))
      ;; MAINNET: MIA cycle 83 / first block BTC 840,350 STX 147,282
      (cycle83Hash (unwrap! (get-block-hash u147282) none))
      (cycle83Data (at-block cycle83Hash
        (contract-call?
          'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd007-citycoin-stacking
          get-stacker MIA_ID u83 userId
        )))
      (cycle83Amount (get stacked cycle83Data))
      ;; MIA vote calculation
      (scaledVote (/ (+ (scale-up cycle82Amount) (scale-up cycle83Amount)) u2))
    )
    ;; check that at least one value is positive
    (asserts! (or (> cycle82Amount u0) (> cycle83Amount u0)) none)
    ;; return scaled or unscaled value
    (if scaled
      (some scaledVote)
      (some (/ scaledVote VOTE_SCALE_FACTOR))
    )
  )
)

;; PRIVATE FUNCTIONS

;; update city vote map
(define-private (update-city-votes
    (cityId uint)
    (voteAmount uint)
    (vote bool)
    (changedVote bool)
  )
  (let ((cityRecord (default-to {
      totalAmountYes: u0,
      totalAmountNo: u0,
      totalVotesYes: u0,
      totalVotesNo: u0,
    }
      (map-get? CityVotes cityId)
    )))
    ;; do not record if amount is 0
    (if (> voteAmount u0)
      ;; handle vote
      (if vote
        ;; handle yes vote
        (map-set CityVotes cityId {
          totalAmountYes: (+ voteAmount (get totalAmountYes cityRecord)),
          totalVotesYes: (+ u1 (get totalVotesYes cityRecord)),
          totalAmountNo: (if changedVote
            (- (get totalAmountNo cityRecord) voteAmount)
            (get totalAmountNo cityRecord)
          ),
          totalVotesNo: (if changedVote
            (- (get totalVotesNo cityRecord) u1)
            (get totalVotesNo cityRecord)
          ),
        })
        ;; handle no vote
        (map-set CityVotes cityId {
          totalAmountYes: (if changedVote
            (- (get totalAmountYes cityRecord) voteAmount)
            (get totalAmountYes cityRecord)
          ),
          totalVotesYes: (if changedVote
            (- (get totalVotesYes cityRecord) u1)
            (get totalVotesYes cityRecord)
          ),
          totalAmountNo: (+ voteAmount (get totalAmountNo cityRecord)),
          totalVotesNo: (+ u1 (get totalVotesNo cityRecord)),
        })
      )
      ;; ignore calls with vote amount equal to 0
      false
    )
  )
)

;; get block hash by height 
(define-private (get-block-hash (blockHeight uint))
  (get-stacks-block-info? id-header-hash blockHeight)
)

;; CREDIT: ALEX math-fixed-point-16.clar

(define-private (scale-up (a uint))
  (* a VOTE_SCALE_FACTOR)
)

(define-private (scale-down (a uint))
  (/ a VOTE_SCALE_FACTOR)
)
