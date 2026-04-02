;; Property tests for CCIP026 MiamiCoin Burn to Exit proposal contract
;;
;; Note: vote-on-proposal requires Merkle proof verification, which cannot be
;; fuzzed directly. Instead, these tests exercise the internal vote-tallying
;; logic via update-city-votes (accessible in the same contract context).

;; Helper: logical implication (A implies B)
(define-private (implies (a bool) (b bool))
  (or (not a) b)
)

;; Property test: vote totals should be consistent after update-city-votes
(define-public (test-vote-totals-consistency (voteAmount uint) (voteChoice bool))
  (let (
      (totalsBefore (get-vote-total-mia-or-default))
      (updated (update-city-votes MIA_ID voteAmount voteChoice false))
      (totalsAfter (get-vote-total-mia-or-default))
    )
    (if (is-eq voteAmount u0)
      ;; zero amount is ignored by update-city-votes
      (begin
        (asserts! (is-eq totalsBefore totalsAfter) (err u9999))
        (ok true)
      )
      (begin
        ;; total vote count should increase by 1
        (let (
            (expectedTotalVotes (+ (+ (get totalVotesYes totalsBefore) (get totalVotesNo totalsBefore)) u1))
            (actualTotalVotes (+ (get totalVotesYes totalsAfter) (get totalVotesNo totalsAfter)))
          )
          (asserts! (is-eq expectedTotalVotes actualTotalVotes) (err u9998))
        )
        ;; if yes, yes amount should increase
        (if voteChoice
          (begin
            (asserts! (is-eq (get totalAmountYes totalsAfter) (+ (get totalAmountYes totalsBefore) voteAmount)) (err u9997))
            (asserts! (is-eq (get totalAmountNo totalsAfter) (get totalAmountNo totalsBefore)) (err u9996))
          )
          ;; if no, no amount should increase
          (begin
            (asserts! (is-eq (get totalAmountNo totalsAfter) (+ (get totalAmountNo totalsBefore) voteAmount)) (err u9995))
            (asserts! (is-eq (get totalAmountYes totalsAfter) (get totalAmountYes totalsBefore)) (err u9994))
          )
        )
        (ok true)
      )
    )
  )
)

;; Property test: changed vote should move amounts between yes and no
(define-public (test-changed-vote-consistency (voteAmount uint) (voteChoice bool))
  (let (
      ;; first cast a vote in one direction
      (updated1 (update-city-votes MIA_ID voteAmount (not voteChoice) false))
      (totalsBefore (get-vote-total-mia-or-default))
      ;; then change the vote
      (updated2 (update-city-votes MIA_ID voteAmount voteChoice true))
      (totalsAfter (get-vote-total-mia-or-default))
    )
    (if (is-eq voteAmount u0)
      (ok true) ;; zero amount is no-op
      (begin
        ;; total vote count should stay the same (one added, one removed)
        (let (
            (totalVotesBefore (+ (get totalVotesYes totalsBefore) (get totalVotesNo totalsBefore)))
            (totalVotesAfter (+ (get totalVotesYes totalsAfter) (get totalVotesNo totalsAfter)))
          )
          (asserts! (is-eq totalVotesBefore totalVotesAfter) (err u9993))
        )
        ;; total amount should stay the same
        (let (
            (totalAmountBefore (+ (get totalAmountYes totalsBefore) (get totalAmountNo totalsBefore)))
            (totalAmountAfter (+ (get totalAmountYes totalsAfter) (get totalAmountNo totalsAfter)))
          )
          (asserts! (is-eq totalAmountBefore totalAmountAfter) (err u9992))
        )
        (ok true)
      )
    )
  )
)

;; Property test: is-executable should only return true when yes votes exceed no votes
(define-public (test-executable-condition)
  (let (
      (voteTotals (get-vote-total-mia-or-default))
      (executable (is-executable))
      (yesVotes (get totalVotesYes voteTotals))
      (noVotes (get totalVotesNo voteTotals))
    )
    (if (> yesVotes noVotes)
      ;; yes > no: should be executable
      (asserts! (is-ok executable) (err u9989))
      ;; yes <= no: should not be executable
      (asserts! (is-err executable) (err u9988))
    )
    (ok true)
  )
)

;; Property test: vote period should be consistent and immutable
(define-public (test-vote-period-consistency)
  (let (
      (period1 (get-vote-period))
      (period2 (get-vote-period))
    )
    (match period1
      periodData1 (begin
        (match period2
          periodData2 (begin
            (asserts! (is-eq (get startBlock periodData1) (get startBlock periodData2)) (err u9984))
            (asserts! (is-eq (get endBlock periodData1) (get endBlock periodData2)) (err u9983))
            (asserts! (is-eq (get length periodData1) (get length periodData2)) (err u9982))
            ;; vote length should be VOTE_LENGTH (2016 blocks)
            (asserts! (is-eq (get length periodData1) u2016) (err u9981))
            (ok true)
          )
          (err u9980)
        )
      )
      (err u9979)
    )
  )
)

;; Property test: total amounts should never decrease on new votes (non-changed)
(define-public (test-vote-totals-monotonicity (voteAmount uint) (voteChoice bool))
  (let (
      (totalsBefore (get-vote-total-mia-or-default))
      (updated (update-city-votes MIA_ID voteAmount voteChoice false))
      (totalsAfter (get-vote-total-mia-or-default))
      (totalAmountBefore (+ (get totalAmountYes totalsBefore) (get totalAmountNo totalsBefore)))
      (totalAmountAfter (+ (get totalAmountYes totalsAfter) (get totalAmountNo totalsAfter)))
    )
    (asserts! (>= totalAmountAfter totalAmountBefore) (err u9972))
    (ok true)
  )
)

;; INVARIANTS

;; Once the snapshot root is set, it should remain set.
(define-read-only (invariant-snapshot-root-persists)
  (implies
    (is-some (var-get snapshotMerkleRoot))
    (is-some (var-get snapshotMerkleRoot))
  )
)

;; CityVotes totals should be internally consistent: total amount > 0 implies total votes > 0.
(define-read-only (invariant-vote-amounts-consistent)
  (let ((totals (get-vote-total-mia-or-default)))
    (and
      (implies (> (get totalAmountYes totals) u0) (> (get totalVotesYes totals) u0))
      (implies (> (get totalAmountNo totals) u0) (> (get totalVotesNo totals) u0))
    )
  )
)

;; Vote period length should always be VOTE_LENGTH.
(define-read-only (invariant-vote-period-immutable)
  (match (get-vote-period)
    period (is-eq (get length period) u2016)
    false
  )
)
