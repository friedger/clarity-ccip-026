;; Property tests for CCIP026 MiamiCoin Burn to Exit proposal contract

;; Property test: vote totals should always be consistent with individual votes
(define-public (test-vote-totals-consistency (voteChoice bool))
  (let (
      (totalsBefore (get-vote-total-mia-or-default))
      (result (vote-on-proposal voteChoice))
      (totalsAfter (get-vote-total-mia-or-default))
    )
    (match result
      success (begin
        ;; Property: total vote count should increase by 1
        (let (
            (expectedTotalVotes (+ (+ (get totalVotesYes totalsBefore) (get totalVotesNo totalsBefore)) u1))
            (actualTotalVotes (+ (get totalVotesYes totalsAfter) (get totalVotesNo totalsAfter)))
          )
          (asserts! (is-eq expectedTotalVotes actualTotalVotes) (err u9999))
        )
        ;; Property: if vote is yes, yes votes should increase, no votes stay same or decrease (for changed votes)
        (if voteChoice
          (begin
            (asserts! (>= (get totalVotesYes totalsAfter) (+ (get totalVotesYes totalsBefore) u1)) (err u9998))
            (asserts! (>= (get totalAmountYes totalsAfter) (get totalAmountYes totalsBefore)) (err u9997))
          )
          ;; Property: if vote is no, no votes should increase, yes votes stay same or decrease (for changed votes)
          (begin
            (asserts! (>= (get totalVotesNo totalsAfter) (+ (get totalVotesNo totalsBefore) u1)) (err u9996))
            (asserts! (>= (get totalAmountNo totalsAfter) (get totalAmountNo totalsBefore)) (err u9995))
          )
        )
        (ok true)
      )
      error (ok true) ;; Errors are acceptable for this property
    )
  )
)

;; Property test: vote should only be possible when proposal is active
(define-public (test-vote-active-invariant (voteChoice bool))
  (let (
      (isActive (is-vote-active))
      (result (vote-on-proposal voteChoice))
    )
    (if (not isActive)
      ;; Property: if vote is not active, voting should always fail with ERR_PROPOSAL_NOT_ACTIVE
      (match result
        success (err u9994) ;; Should never succeed when inactive
        error (begin
          (asserts! (or (is-eq error u26005) (is-eq error u26004)) (err (+ u1000000 error))) ;; Should be ERR_PROPOSAL_NOT_ACTIVE or ERR_USER_NOT_FOUND
          (ok true)
        )
      )
      ;; If active, any result is acceptable (depends on user state)
      (ok true)
    )
  )
)

;; Property test: execute should only succeed when proposal is executable
(define-public (test-execute-preconditions)
  (let (
      (executable (is-executable))
      (result (execute tx-sender))
    )
    (match result
      success (begin
        ;; Property: if execute succeeds, the proposal must have been executable
        (asserts! (is-ok executable) (err u9992))
        ;; Property: after execution, vote should be inactive
        (asserts! (not (var-get voteActive)) (err u9991))
        (ok true)
      )
      error (begin
        ;; Property: if execute fails and proposal was executable, error should be from DAO operations
        (if (is-ok executable)
          ;; Accept various DAO-related errors
          (ok true)
          ;; If not executable, should fail with ERR_VOTE_FAILED
          (begin
            (asserts! (is-eq error u26007) (err u9990)) ;; Should be ERR_VOTE_FAILED
            (ok true)
          )
        )
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
      ;; Property: if yes votes > no votes, should be executable
      (asserts! (is-ok executable) (err u9989))
      ;; Property: if yes votes <= no votes, should not be executable
      (asserts! (is-err executable) (err u9988))
    )
    (ok true)
  )
)

;; Property test: vote amounts should be properly scaled
(define-public (test-vote-scaling-consistency (userId uint))
  (let (
      (scaledVote (get-mia-vote userId true))
      (unscaledVote (get-mia-vote userId false))
    )
    (match scaledVote
      scaledAmount (begin
        (match unscaledVote
          unscaledAmount (begin
            ;; Property: scaled vote should equal unscaled vote * VOTE_SCALE_FACTOR
            (let ((expectedScaled (* unscaledAmount (pow u10 u16))))
              (asserts! (is-eq scaledAmount expectedScaled) (err u9987))
              (ok true)
            )
          )
          ;; If unscaled is none, scaled should also be none
          (err u9986)
        )
      )
      ;; If scaled is none, unscaled should also be none
      (begin
        (asserts! (is-none unscaledVote) (err u9985))
        (ok true)
      )
    )
  )
)

;; Property test: vote period should be consistent and immutable after initialization
(define-public (test-vote-period-consistency)
  (let (
      (period1 (get-vote-period))
      (period2 (get-vote-period))
    )
    (match period1
      periodData1 (begin
        (match period2
          periodData2 (begin
            ;; Property: vote period should be consistent across calls
            (asserts! (is-eq (get startBlock periodData1) (get startBlock periodData2)) (err u9984))
            (asserts! (is-eq (get endBlock periodData1) (get endBlock periodData2)) (err u9983))
            (asserts! (is-eq (get length periodData1) (get length periodData2)) (err u9982))
            ;; Property: vote length should be VOTE_LENGTH (2016 blocks)
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

;; Property test: voter info should be persistent and consistent
(define-public (test-voter-info-persistence (userId uint) (voteChoice bool))
  (let (
      (infoBefore (get-voter-info userId))
      (voteResult (vote-on-proposal voteChoice))
      (infoAfter (get-voter-info userId))
    )
    (match voteResult
      success (begin
        (match infoAfter
          voterData (begin
            ;; Property: after successful vote, voter info should exist and match the vote
            (asserts! (is-eq (get vote voterData) voteChoice) (err u9978))
            ;; Property: vote amount should be positive if vote succeeded
            (asserts! (> (get mia voterData) u0) (err u9977))
            (ok true)
          )
          (err u9976) ;; Voter info should exist after successful vote
        )
      )
      error (begin
        ;; Property: if vote failed, voter info should remain unchanged
        (asserts! (is-eq infoBefore infoAfter) (err u9975))
        (ok true)
      )
    )
  )
)

;; Property test: duplicate votes should be handled correctly
(define-public (test-duplicate-vote-handling (userId uint) (voteChoice bool))
  (let (
      ;; Try to vote twice with the same choice
      (firstVote (vote-on-proposal voteChoice))
      (secondVote (vote-on-proposal voteChoice))
    )
    (match firstVote
      success1 (begin
        ;; Property: second identical vote should fail with ERR_VOTED_ALREADY
        (match secondVote
          success2 (err u9974) ;; Should not succeed twice with same vote
          error (begin
            (asserts! (is-eq error u26002) (err u9973)) ;; Should be ERR_VOTED_ALREADY
            (ok true)
          )
        )
      )
      error (begin
        ;; If first vote failed, second vote behavior depends on the error
        (ok true)
      )
    )
  )
)

;; Property test: vote totals should never decrease incorrectly
(define-public (test-vote-totals-monotonicity (voteChoice bool))
  (let (
      (totalsBefore (get-vote-total-mia-or-default))
      (voteResult (vote-on-proposal voteChoice))
      (totalsAfter (get-vote-total-mia-or-default))
    )
    (match voteResult
      success (begin
        ;; Property: total amount of votes should never decrease on successful vote
        (let (
            (totalAmountBefore (+ (get totalAmountYes totalsBefore) (get totalAmountNo totalsBefore)))
            (totalAmountAfter (+ (get totalAmountYes totalsAfter) (get totalAmountNo totalsAfter)))
          )
          (asserts! (>= totalAmountAfter totalAmountBefore) (err u9972))
          (ok true)
        )
      )
      error (begin
        ;; Property: on failed vote, totals should remain unchanged
        (asserts! (is-eq (get totalAmountYes totalsBefore) (get totalAmountYes totalsAfter)) (err u9971))
        (asserts! (is-eq (get totalAmountNo totalsBefore) (get totalAmountNo totalsAfter)) (err u9970))
        (asserts! (is-eq (get totalVotesYes totalsBefore) (get totalVotesYes totalsAfter)) (err u9969))
        (asserts! (is-eq (get totalVotesNo totalsBefore) (get totalVotesNo totalsAfter)) (err u9968))
        (ok true)
      )
    )
  )
)