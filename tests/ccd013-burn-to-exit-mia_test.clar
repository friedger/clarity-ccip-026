(define-public (prepare)
  (begin
    ;; send 20,000 STX to the contract
    (try! (stx-transfer? u20000000000 tx-sender
      'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3
    ))
    (ok true)
  )
)

(define-public (test-get-redemption-for-balance)
  (let (
      (amountUMia u0)
      (expectedResult (ok u0))
      (ustx (contract-call? .ccd013-burn-to-exit-mia get-redemption-for-balance
        amountUMia
      ))
    )
    (asserts! (is-eq ustx expectedResult) (err u9999))
    (ok true)
  )
)

(define-public (test-get-redemption-for-balance-1m)
  (let (
      (amountUMia u1000000000000) ;; 1,000,000 Mia
      (expectedResult (ok u1700000000)) ;; 1,700 STX
      (ustx (contract-call? .ccd013-burn-to-exit-mia get-redemption-for-balance
        amountUMia
      ))
    )
    (asserts! (is-eq ustx expectedResult) (err u9999))
    (ok true)
  )
)

(define-public (test-get-redemption-for-balance-10m)
  (let (
      (amountUMia u10000000000000) ;; 10,000,000 Mia
      (expectedResult (ok u17000000000)) ;; 17,000 STX
      (ustx (contract-call? .ccd013-burn-to-exit-mia get-redemption-for-balance
        amountUMia
      ))
    )
    (asserts! (is-eq ustx expectedResult) (err ustx))
    (ok true)
  )
)

(define-public (test-get-redemption-for-balance-100m)
  (let (
      (amountUMia u100000000000000) ;; 100,000,000 Mia
      (expectedResult (err u12010)) ;; not enough stx in contract
      (ustx (contract-call? .ccd013-burn-to-exit-mia get-redemption-for-balance
        amountUMia
      ))
    )
    (asserts! (is-eq ustx expectedResult) (err u9999))
    (ok true)
  )
)
