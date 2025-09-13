
(define-public (test-get-redemption-for-balance (amountUMia uint))
  (match (get-redemption-for-balance amountUMia)
    uStx (begin
      (asserts! (is-eq uStx  (/ (* u1700 amountUMia) u1000000)) (err u9999))
      (ok true))
    err (ok false)
  )
)