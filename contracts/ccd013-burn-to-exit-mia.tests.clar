
(define-public (test-get-redemption-for-balance (amountUMia uint))
  (match (get-redemption-for-balance (* amountUMia u1000000000))
    uStx (begin
      (asserts! (is-eq uStx  (/ (* u1700 amountUMia u1000000000) u1000000)) (err u9999))
      (ok true))
    error (ok false)
  )
)