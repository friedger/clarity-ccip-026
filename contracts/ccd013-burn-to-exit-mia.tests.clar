
(define-public (test-get-redemption-for-balance (amountUMia uint))
  (match (get-redemption-for-balance (* amountUMia u1000000000))
    uStx (begin
      (asserts! (is-eq uStx  (/ (* u1700 amountUMia u1000000000) u1000000)) (err u9999))
      (ok true))
    error (ok false)
  )
)

;; Property test: redeem-mia should never return more STX than the redemption formula allows
(define-public (test-redeem-mia-stx-amount-bounded (amountUMia uint))
  (let (
      (result (redeem-mia amountUMia))
      (maxExpectedStx (match (get-redemption-for-balance amountUMia)
        expectedStx expectedStx
        error u0))
    )
    (match result
      success (begin
        ;; Property: returned STX should never exceed the calculated maximum
        (asserts! (<= (get uStx success) maxExpectedStx) (err u9999))
        (ok true)
      )
      error (ok true) ;; Errors are acceptable for this property
    )
  )
)

;; Property test: redeem-mia should never redeem more MIA than requested (capped by MAX_PER_TRANSACTION)
(define-public (test-redeem-mia-amount-capped (amountUMia uint))
  (let (
      (result (redeem-mia amountUMia))
      (maxPerTransaction u10000000000000) ;; 10m MIA in uMIA
      (cappedAmount (if (> amountUMia maxPerTransaction) maxPerTransaction amountUMia))
    )
    (match result
      redeemed (begin
        ;; Property: redeemed amount should never exceed the capped input amount
        (asserts! (<= (get uMia redeemed) cappedAmount) (err u9998))
        ;; Property: if any MIA was redeemed, some STX should be returned
        (asserts! (implies (> (get uMia redeemed) u0) (> (get uStx redeemed) u0)) (err u9997))
        (ok true)
      )
      error (ok true) ;; Errors are acceptable for this property
    )
  )
)

;; Property test: redeem-mia should maintain the correct ratio between MIA and STX
(define-public (test-redeem-mia-ratio-consistency (amountUMia uint))
  (let (
      (result (redeem-mia amountUMia))
    )
    (match result
      redeemed (begin
        (let (
            (redeemedMia (get uMia redeemed))
            (redeemedStx (get uStx redeemed))
            (expectedStx (/ (* redeemedMia u1700) u1000000)) ;; REDEMPTION_RATIO / REDEMPTION_SCALE_FACTOR
          )
          ;; Property: STX received should match the redemption ratio for the actual MIA redeemed
          ;; Allow for some tolerance due to rounding
          (asserts! (<= redeemedStx (+ expectedStx u1)) (err u9996))
          (asserts! (>= redeemedStx (- expectedStx u1)) (err u9995))
          (ok true)
        )
      )
      error (ok true) ;; Errors are acceptable for this property
    )
  )
)

;; Property test: redeem-mia should never succeed if redemptions are disabled
(define-public (test-redeem-mia-disabled-invariant (amountUMia uint))
  (let (
      (enabled (is-redemption-enabled))
      (result (redeem-mia amountUMia))
    )
    (if (not enabled)
      ;; Property: if redemptions are disabled, redeem-mia should always fail with ERR_NOT_ENABLED
      (match result
        success (err u9994) ;; Should never succeed when disabled
        error (begin
          (asserts! (is-eq error u13005) (err (+ u9900000 error))) ;; Should be ERR_NOT_ENABLED
          (ok true)
        )
      )
      ;; If enabled, any result is acceptable
      (ok true)
    )
  )
)

;; Property test: redeem-mia with zero amount should always fail with ERR_NOTHING_TO_REDEEM
(define-public (test-redeem-mia-zero-invariant)
  (let (
      (result (redeem-mia u0))
    )
    ;; Property: zero amount should always result in ERR_NOTHING_TO_REDEEM
    (match result
      success (err u9992) ;; Should never succeed with zero amount
      error (begin
        (asserts! (or (is-eq error u13007) (is-eq error u13006) (is-eq error u13005)) (err (+ u9900000 error))) ;; Should be ERR_NOTHING_TO_REDEEM
        (ok true)
      )
    )
  )
)

;; Property test: successful redemption should update total redeemed and transferred amounts
(define-public (test-redeem-mia-state-consistency (amountUMia uint))
  (let (
      (totalRedeemedBefore (get-total-redeemed))
      (totalTransferredBefore (get-total-transferred))
      (result (redeem-mia amountUMia))
      (totalRedeemedAfter (get-total-redeemed))
      (totalTransferredAfter (get-total-transferred))
    )
    (match result
      redeemed (begin
        ;; Property: total redeemed should increase by the amount redeemed
        (asserts! (is-eq totalRedeemedAfter
                        (+ totalRedeemedBefore (get uMia redeemed))) (err u9990))
        ;; Property: total transferred should increase by the STX amount transferred
        (asserts! (is-eq totalTransferredAfter
                        (+ totalTransferredBefore (get uStx redeemed))) (err u9989))
        (ok true)
      )
      error (begin
        ;; Property: on failure, totals should remain unchanged
        (asserts! (is-eq totalRedeemedAfter totalRedeemedBefore) (err u9988))
        (asserts! (is-eq totalTransferredAfter totalTransferredBefore) (err u9987))
        (ok true)
      )
    )
  )
)

(define-public (test-mining-treasury-constant)
  (let ((ustx-mining-treasury (stx-account 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-mining-v3)))
    (asserts! (is-eq (+ (get locked ustx-mining-treasury) (get unlocked ustx-mining-treasury)) u10241497066794) (err ustx-mining-treasury))
    (ok true)
  )
)

;; unlocked amount at stacks block height 3491155 is u31767086308
(define-public (test-reward-treasury-plus-redeemed-constant)
  (let (
      (ustx-rewards-treasury (get-redemption-current-balance))
      (ustx-transferred (get-total-transferred))
    )
    (asserts!  (is-eq (+ ustx-rewards-treasury ustx-transferred) u31767086308) (err (+ ustx-rewards-treasury ustx-transferred)))
    (ok true)
  )
)

;; invariants

(define-read-only (invariant-mining-treasury-constant)
  (let ((ustx-mining-treasury (stx-account 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-mining-v3)))
    (is-eq (+ (get locked ustx-mining-treasury) (get unlocked ustx-mining-treasury)) u10241497066794)
  )
)

;; unlocked amount at stacks block height 3491155 is u31767086308
(define-read-only (invariant-reward-treasury-plus-redeemed-constant)
  (let (
      (ustx-rewards-treasury (get-redemption-current-balance))
      (ustx-transferred (get-total-transferred))
    )
    (is-eq (+ ustx-rewards-treasury ustx-transferred) u31767086308)
  )
)

;; Helper function for logical implication (A implies B)
(define-private (implies (a bool) (b bool))
  (or (not a) b)
)