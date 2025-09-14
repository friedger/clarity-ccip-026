(define-public (test-vote)
    (begin
    (unwrap-err! (contract-call? .ccip026-miamicoin-burn-to-exit vote-on-proposal true) (err u9999))
    ;; @caller 'SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA
    (try! (contract-call? .ccip026-miamicoin-burn-to-exit vote-on-proposal true))
    ;; @caller 'SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A
    (try! (contract-call? .ccip026-miamicoin-burn-to-exit vote-on-proposal true))
    (ok true)
    )
)