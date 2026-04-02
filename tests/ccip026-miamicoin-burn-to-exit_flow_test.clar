;; @name vote and execute
(define-public (test-vote)
  (begin
    ;; @caller 'SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA
    (unwrap!
      (contract-call? .ccip026-miamicoin-burn-to-exit vote-on-proposal true u1444790120000000000000000000000 (list 0x43f51785937b153496e1bd092a4999405d697138273681aba55e841756043fe2) (list false))
      (err "vote A failed")
    )
    ;; @caller 'SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A
    (unwrap!
      (contract-call? .ccip026-miamicoin-burn-to-exit vote-on-proposal true u20863720000000000000000000000 (list 0x24922a6b2619b82047b5fb427afa1219e7e28f1e5c721f4435780970e1777ba2) (list true))
      (err "vote B failed")
    )
    ;; @caller 'SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE
    ;; @type-hints trait_reference
    (unwrap!
      (contract-call?
        'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd001-direct-execute
        direct-execute .ccip026-miamicoin-burn-to-exit
      )
      (err "direct execute failed")
    )
    (ok true)
  )
)
