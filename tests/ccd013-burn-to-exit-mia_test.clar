(define-public (prepare)
  (begin
    ;; send 20,000 STX to the contract
    (try! (stx-transfer? u20000000000 tx-sender
      'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3
    ))
    (ok true)
  )
)

;; Test that get-redemption-for-balance returns none when ratio is 0 (not initialized)
(define-public (test-get-redemption-for-balance)
  (let (
      (amount-umia u0)
      ;; before init, ratio is 0 so result is none
      (expectedResult none)
      (result (contract-call? .ccd013-burn-to-exit-mia get-redemption-for-balance
        amount-umia
      ))
    )
    (asserts! (is-eq result expectedResult) (err u9999))
    (ok true)
  )
)

;; Test that the formula works correctly with any ratio
;; When ratio is 0 (not initialized), returns none - which is correct
(define-public (test-get-redemption-for-balance-1m)
  (let (
      (amount-umia u1000000000000) ;; 1,000,000 Mia
      (ratio (contract-call? .ccd013-burn-to-exit-mia get-redemption-ratio))
      (scale-factor u1000000)
      (result (contract-call? .ccd013-burn-to-exit-mia get-redemption-for-balance
        amount-umia
      ))
    )
    ;; when ratio is 0, expect none; when > 0, verify the formula
    (if (is-eq ratio u0)
      ;; not initialized - should return none
      (begin
        (asserts! (is-eq result none) (err u9997))
        (ok true)
      )
      ;; initialized - verify the calculation
      (let ((expected-stx (/ (* ratio amount-umia) scale-factor)))
        (match result
          redemption
          (begin
            (asserts! (is-eq (get ustx redemption) expected-stx) (err u9999))
            (ok true)
          )
          (err u9998) ;; should not be none after init
        )
      )
    )
  )
)

(define-public (test-get-redemption-for-balance-10m)
  (let (
      (amount-umia u10000000000000) ;; 10,000,000 Mia
      (ratio (contract-call? .ccd013-burn-to-exit-mia get-redemption-ratio))
      (scale-factor u1000000)
      (result (contract-call? .ccd013-burn-to-exit-mia get-redemption-for-balance
        amount-umia
      ))
    )
    (if (is-eq ratio u0)
      (begin
        (asserts! (is-eq result none) (err u9997))
        (ok true)
      )
      (let ((expected-stx (/ (* ratio amount-umia) scale-factor)))
        (match result
          redemption
          (begin
            (asserts! (is-eq (get ustx redemption) expected-stx) (err u9999))
            (ok true)
          )
          (err u9998) ;; should not be none after init
        )
      )
    )
  )
)

;; when redemption exceeds contract balance, it returns the contract balance
;; when not initialized (ratio = 0), returns none
(define-public (test-get-redemption-for-balance-100m)
  (let (
      (amount-umia u100000000000000) ;; 100,000,000 Mia
      (ratio (contract-call? .ccd013-burn-to-exit-mia get-redemption-ratio))
      (contract-balance (contract-call? .ccd013-burn-to-exit-mia get-redemption-current-balance))
      (result (contract-call? .ccd013-burn-to-exit-mia get-redemption-for-balance
        amount-umia
      ))
    )
    (if (is-eq ratio u0)
      (begin
        (asserts! (is-eq result none) (err u9997))
        (ok true)
      )
      ;; initialized - should return (some contractBalance) since amount exceeds available
      (match result
        redemption
        (begin
          (asserts! (is-eq (get ustx redemption) contract-balance) (err u9999))
          (ok true)
        )
        (err u9998) ;; should not be none after init
      )
    )
  )
)
