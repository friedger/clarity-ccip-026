
(define-public (test-get-redemption-for-balance (amount-umia uint))
  (let (
      (ratio (get-redemption-ratio))
      (scale-factor u1000000)
    )
    (match (get-redemption-for-balance (* amount-umia u1000000000))
      ustx (begin
        (asserts! (is-eq ustx (/ (* ratio amount-umia u1000000000) scale-factor)) (err u9999))
        (ok true))
      (ok false) ;; none case - ratio not initialized yet
    )
  )
)

;; Property test: redeem-mia should never return more STX than the redemption formula allows
(define-public (test-redeem-mia-stx-amount-bounded (amount-umia uint))
  (let (
      (result (redeem-mia amount-umia))
      (max-expected-stx (match (get-redemption-for-balance amount-umia)
        expected-stx expected-stx
        u0)) ;; none case
    )
    (match result
      success (begin
        ;; Property: returned STX should never exceed the calculated maximum
        (asserts! (<= (get ustx success) max-expected-stx) (err u9999))
        (ok true)
      )
      error (ok true) ;; Errors are acceptable for this property
    )
  )
)

;; Property test: redeem-mia should never redeem more MIA than requested (capped by MAX_PER_TRANSACTION)
(define-public (test-redeem-mia-amount-capped (amount-umia uint))
  (let (
      (result (redeem-mia amount-umia))
      (max-per-transaction u10000000000000) ;; 10m MIA in uMIA
      (capped-amount (if (> amount-umia max-per-transaction) max-per-transaction amount-umia))
    )
    (match result
      redeemed (begin
        ;; Property: redeemed amount should never exceed the capped input amount
        (asserts! (<= (get umia redeemed) capped-amount) (err u9998))
        ;; Property: if any MIA was redeemed, some STX should be returned
        (asserts! (implies (> (get umia redeemed) u0) (> (get ustx redeemed) u0)) (err u9997))
        (ok true)
      )
      error (ok true) ;; Errors are acceptable for this property
    )
  )
)

;; Property test: redeem-mia should maintain the correct ratio between MIA and STX
(define-public (test-redeem-mia-ratio-consistency (amount-umia uint))
  (let (
      (result (redeem-mia amount-umia))
      (ratio (get-redemption-ratio))
      (scale-factor u1000000)
    )
    (match result
      redeemed (begin
        (let (
            (redeemed-mia (get umia redeemed))
            (redeemed-stx (get ustx redeemed))
            (expected-stx (/ (* redeemed-mia ratio) scale-factor))
          )
          ;; Property: STX received should match the redemption ratio for the actual MIA redeemed
          ;; Allow for some tolerance due to rounding
          (asserts! (<= redeemed-stx (+ expected-stx u1)) (err u9996))
          (asserts! (>= redeemed-stx (- expected-stx u1)) (err u9995))
          (ok true)
        )
      )
      error (ok true) ;; Errors are acceptable for this property
    )
  )
)

;; Property test: redeem-mia should never succeed if redemptions are disabled
(define-public (test-redeem-mia-disabled-invariant (amount-umia uint))
  (let (
      (enabled (is-redemption-enabled))
      (result (redeem-mia amount-umia))
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
(define-public (test-redeem-mia-state-consistency (amount-umia uint))
  (let (
      (total-redeemed-before (get-total-redeemed))
      (total-transferred-before (get-total-transferred))
      (result (redeem-mia amount-umia))
      (total-redeemed-after (get-total-redeemed))
      (total-transferred-after (get-total-transferred))
    )
    (match result
      redeemed (begin
        ;; Property: total redeemed should increase by the amount redeemed
        (asserts! (is-eq total-redeemed-after
                        (+ total-redeemed-before (get umia redeemed))) (err u9990))
        ;; Property: total transferred should increase by the STX amount transferred
        (asserts! (is-eq total-transferred-after
                        (+ total-transferred-before (get ustx redeemed))) (err u9989))
        (ok true)
      )
      error (begin
        ;; Property: on failure, totals should remain unchanged
        (asserts! (is-eq total-redeemed-after total-redeemed-before) (err u9988))
        (asserts! (is-eq total-transferred-after total-transferred-before) (err u9987))
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
;; once cycle is over unlocked amount is u953618961322
(define-public (test-reward-treasury-plus-redeemed-constant)
  (let (
      (ustx-rewards-treasury (get-redemption-current-balance))
      (ustx-transferred (get-total-transferred))
      (total (+ ustx-rewards-treasury ustx-transferred))
    )
    (asserts!  (or (is-eq total u31767086308) (is-eq total u953618961322)) (err total))
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
;; once cycle is over unlocked amount is u953618961322
(define-read-only (invariant-reward-treasury-plus-redeemed-constant)
  (let (
      (ustx-rewards-treasury (get-redemption-current-balance))
      (ustx-transferred (get-total-transferred))
      (total (+ ustx-rewards-treasury ustx-transferred))
    )
    (or (is-eq total u31767086308) (is-eq total u953618961322))
  )
)

;; Total MIA redeemed should never exceed the total supply snapshot.
(define-read-only (invariant-total-redeemed-leq-supply)
  (or
    (not (var-get redemptions-enabled))
    (<= (get-total-redeemed) (var-get total-supply))
  )
)

;; Total STX transferred should never exceed the initial treasury balance snapshot.
(define-read-only (invariant-total-transferred-leq-balance)
  (or
    (not (var-get redemptions-enabled))
    (<= (get-total-transferred) (var-get contract-balance))
  )
)

;; Once redemptions are enabled, the ratio, total supply, and contract balance
;; snapshots should never change (they are set once in initialize-redemption).
;; This invariant checks that redemption-ratio is non-zero when enabled.
(define-read-only (invariant-ratio-nonzero-when-enabled)
  (or
    (not (var-get redemptions-enabled))
    (and
      (> (var-get redemption-ratio) u0)
      (> (var-get total-supply) u0)
      (> (var-get contract-balance) u0)
    )
  )
)

;; Helper function for logical implication (A implies B)
(define-private (implies (a bool) (b bool))
  (or (not a) b)
)
