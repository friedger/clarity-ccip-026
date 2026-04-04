;; @name vote and execute
(define-public (test-vote)
  (begin
    ;; @caller 'SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA
    (unwrap!
      (contract-call? .ccip026-miamicoin-burn-to-exit vote-on-proposal true
        u1444790120000000000000000000000
        (list
          0xefdc99ab8ea4329016f5f77513d2905a5af9d1d682d821456dbc6ead5b60b57f
          0xd0a919a7b9c6f04be5695f4a65f572e712132582f875252e7ced9c351bd464b7
          0x2717442f09ceb3645b06a9a7d876030d7b9b448311ff8516b09f96beb92677e6
          0xd7e37bbf8a914fe196161499c97d28aabcc71e8bc41641dd0a25d23ffd4e04a7
          0x169640718ef67934a7964d1d2b656c45015e957f3772928e154b1b15ab45dbe9
          0x155ae1ff87a70c9bd4ad70d5f87e3ff2b8f90bfdf1f51d7d7bb5ac7f1863e74f
          0xa7f4b4b6cac1135c34da475fdd04891dd1214cef08f3ccbb4b9631deafcbb5bc
          0xccbb09cb2597894f8b3c29450ee17ceb1d2206866881e45127c847e7484bcf15
          0xc300da1853ccafaf418d20255fe30f0189751a42c0f0b2e6679b8a60dfe191b0
        )
        (list false true false false false true false true false)
      )
      (err "vote A failed")
    )
    ;; @caller 'SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A
    (unwrap!
      (contract-call? .ccip026-miamicoin-burn-to-exit vote-on-proposal true
        u20863720000000000000000000000
        (list
          0xc51d87b59cdf3baef0f59cce37a993f17d2771078d9d59fb92604470f932f00b
          0xb03fabfd47b000498ff700267bdf9e0f3ce75cbe4cc0b398bb883cd2b8f43112
          0x7f4be427d0bf22036d21b9189c1e25e1fb68d67edb7991d7b05aa09354b6608f
          0xed5bd1c65f1d344b9f20b9197cc0f6b401ec91c0db9b3fbbea27860bf9dcaee7
          0x4a39628392734db8cb565bc4ca41c95c8b3a6f32477e37ab652fde5f6c23e7ca
          0x3587aff093e0224ca5260b2fd738e3a0b647f7ca47869dcd6dc2b953f95704e8
          0xc72cdbec0f90e00ea7e556f5c68644c47cd5628c539770ef446d54c71d0088cc
          0x25b3201efeb5000037b877ac1101a4e3a6a380e366fc8e89d0b99b33aa2d7d1b
          0xc300da1853ccafaf418d20255fe30f0189751a42c0f0b2e6679b8a60dfe191b0
        )
        (list true false true true true true false false false)
      )
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
