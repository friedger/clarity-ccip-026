(define-public (test-vote)
  (begin
    ;; @caller 'SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA
    (try! (vote))
    ;; @caller 'SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A
    (try! (vote))
    ;; @caller 'SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE
    (try! (direct-execute))
    ;; @caller 'SP3YYGCGX1B62CYAH4QX7PQE63YXG7RDTXD8BQHJQ
    (try! (direct-execute))
    ;; @caller 'SPN4Y5QPGQA8882ZXW90ADC2DHYXMSTN8VAR8C3X
    (try! (direct-execute))
    ;; @caller 'SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA
    (try! (redeem-1m))
    (err u0)
  )
)

(define-private (vote)
  (begin
    (try! (contract-call? .ccip026-miamicoin-burn-to-exit vote-on-proposal true))
    (if true
      (err u1234)
      (ok true)
    ) ;; force failure
  )
)

(define-private (direct-execute)
  (begin
    (try! (contract-call?
      'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd001-direct-execute
      direct-execute .ccip026-miamicoin-burn-to-exit
    ))
    (ok true)
  )
)

(define-private (redeem-1m)
  (let ((result (contract-call? .ccd013-burn-to-exit-mia redeem-mia u1000000000000)))
    (asserts! (is-ok result) (err (unwrap-err! result (err u999))))
    (asserts! (is-eq (get uStx (unwrap-panic result)) u170)
      (err (get uStx (unwrap-panic result)))
    )
    (ok true)
  )
)
