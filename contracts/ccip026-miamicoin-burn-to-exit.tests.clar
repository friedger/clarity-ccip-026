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
(define-public (test-vote-totals-consistency (vote-amount uint) (vote-choice bool))
  (let (
      (totals-before (get-vote-total-mia-or-default))
      (updated (update-city-votes MIA_ID vote-amount vote-choice false))
      (totals-after (get-vote-total-mia-or-default))
    )
    (if (is-eq vote-amount u0)
      ;; zero amount is ignored by update-city-votes
      (begin
        (asserts! (is-eq totals-before totals-after) (err u9999))
        (ok true)
      )
      (begin
        ;; total vote count should increase by 1
        (let (
            (expected-total-votes (+ (+ (get total-votes-yes totals-before) (get total-votes-no totals-before)) u1))
            (actual-total-votes (+ (get total-votes-yes totals-after) (get total-votes-no totals-after)))
          )
          (asserts! (is-eq expected-total-votes actual-total-votes) (err u9998))
        )
        ;; if yes, yes amount should increase
        (if vote-choice
          (begin
            (asserts! (is-eq (get total-amount-yes totals-after) (+ (get total-amount-yes totals-before) vote-amount)) (err u9997))
            (asserts! (is-eq (get total-amount-no totals-after) (get total-amount-no totals-before)) (err u9996))
          )
          ;; if no, no amount should increase
          (begin
            (asserts! (is-eq (get total-amount-no totals-after) (+ (get total-amount-no totals-before) vote-amount)) (err u9995))
            (asserts! (is-eq (get total-amount-yes totals-after) (get total-amount-yes totals-before)) (err u9994))
          )
        )
        (ok true)
      )
    )
  )
)

;; Property test: changed vote should move amounts between yes and no
(define-public (test-changed-vote-consistency (vote-amount uint) (vote-choice bool))
  (let (
      ;; first cast a vote in one direction
      (updated1 (update-city-votes MIA_ID vote-amount (not vote-choice) false))
      (totals-before (get-vote-total-mia-or-default))
      ;; then change the vote
      (updated2 (update-city-votes MIA_ID vote-amount vote-choice true))
      (totals-after (get-vote-total-mia-or-default))
    )
    (if (is-eq vote-amount u0)
      (ok true) ;; zero amount is no-op
      (begin
        ;; total vote count should stay the same (one added, one removed)
        (let (
            (total-votes-before (+ (get total-votes-yes totals-before) (get total-votes-no totals-before)))
            (total-votes-after (+ (get total-votes-yes totals-after) (get total-votes-no totals-after)))
          )
          (asserts! (is-eq total-votes-before total-votes-after) (err u9993))
        )
        ;; total amount should stay the same
        (let (
            (total-amount-before (+ (get total-amount-yes totals-before) (get total-amount-no totals-before)))
            (total-amount-after (+ (get total-amount-yes totals-after) (get total-amount-no totals-after)))
          )
          (asserts! (is-eq total-amount-before total-amount-after) (err u9992))
        )
        (ok true)
      )
    )
  )
)

;; Property test: is-executable should only return true when yes votes exceed no votes
(define-public (test-executable-condition)
  (let (
      (vote-totals (get-vote-total-mia-or-default))
      (executable (is-executable))
      (yes-votes (get total-votes-yes vote-totals))
      (no-votes (get total-votes-no vote-totals))
    )
    (if (> yes-votes no-votes)
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
      period-data-1 (begin
        (match period2
          period-data-2 (begin
            (asserts! (is-eq (get start-block period-data-1) (get start-block period-data-2)) (err u9984))
            (asserts! (is-eq (get end-block period-data-1) (get end-block period-data-2)) (err u9983))
            (asserts! (is-eq (get length period-data-1) (get length period-data-2)) (err u9982))
            ;; vote length should be VOTE_LENGTH (2016 blocks)
            (asserts! (is-eq (get length period-data-1) u2016) (err u9981))
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
(define-public (test-vote-totals-monotonicity (vote-amount uint) (vote-choice bool))
  (let (
      (totals-before (get-vote-total-mia-or-default))
      (updated (update-city-votes MIA_ID vote-amount vote-choice false))
      (totals-after (get-vote-total-mia-or-default))
      (total-amount-before (+ (get total-amount-yes totals-before) (get total-amount-no totals-before)))
      (total-amount-after (+ (get total-amount-yes totals-after) (get total-amount-no totals-after)))
    )
    (asserts! (>= total-amount-after total-amount-before) (err u9972))
    (ok true)
  )
)

;; INVARIANTS

;; CityVotes totals should be internally consistent: total amount > 0 implies total votes > 0.
(define-read-only (invariant-vote-amounts-consistent)
  (let ((totals (get-vote-total-mia-or-default)))
    (and
      (implies (> (get total-amount-yes totals) u0) (> (get total-votes-yes totals) u0))
      (implies (> (get total-amount-no totals) u0) (> (get total-votes-no totals) u0))
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
