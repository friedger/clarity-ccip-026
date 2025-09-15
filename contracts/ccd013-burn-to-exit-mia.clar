;; Title: CCD013 - MIA Burn To Exit
;; Version: 1.0.0
;; Summary: An extension that allows users to redeem MIA tokens for a portion of the MIA rewards treasury.
;; Description: An extension that provides the ability to claim a portion of the MIA rewards treasury in exchange for MIA tokens.

;; TRAITS
(impl-trait 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.extension-trait.extension-trait)

;; CONSTANTS

;; error codes
(define-constant ERR_UNAUTHORIZED (err u12000))
(define-constant ERR_PANIC (err u12001))
(define-constant ERR_GETTING_TOTAL_SUPPLY (err u12002))
(define-constant ERR_GETTING_REDEMPTION_BALANCE (err u12003))
(define-constant ERR_ALREADY_ENABLED (err u12004))
(define-constant ERR_NOT_ENABLED (err u12005))
(define-constant ERR_BALANCE_NOT_FOUND (err u12006))
(define-constant ERR_NOTHING_TO_REDEEM (err u12007))
(define-constant ERR_ALREADY_CLAIMED (err u12008))
(define-constant ERR_SUPPLY_CALCULATION (err u12009))
(define-constant ERR_NOT_ENOUGH_FUNDS_IN_CONTRACT (err u12010))

;; helpers
(define-constant MICRO_CITYCOINS (pow u10 u6)) ;; 6 decimal places
(define-constant REDEMPTION_SCALE_FACTOR (pow u10 u6)) ;; 1m MIA = 1700 STX
(define-constant REDEMPTION_RATIO u1700) ;; start with 0.0017 STX per MIA
(define-constant MAX_PER_TRANSACTION (* u10000000 MICRO_CITYCOINS)) ;; max 10m MIA per transaction

;; DATA VARS
(define-data-var redemptionsEnabled bool false)

(define-data-var totalRedeemed uint u0)
(define-data-var totalTransferred uint u0)

;; DATA MAPS
(define-map RedemptionClaims
  principal
  {
    uMia: uint,
    uStx: uint,
  }
)

;; PUBLIC FUNCTIONS

(define-public (is-dao-or-extension)
  (ok (asserts!
    (or
      (is-eq tx-sender 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.base-dao)
      (contract-call? 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.base-dao
        is-extension contract-caller
      )
    )
    ERR_UNAUTHORIZED
  ))
)

(define-public (callback
    (sender principal)
    (memo (buff 34))
  )
  (ok true)
)

;; initialize contract after deployment to start redemptions
(define-public (initialize)
  (begin
    ;; revoke delegation
    (try! (contract-call?
      'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3
      revoke-delegate-stx
    ))
    ;; enable redemptions
    (var-set redemptionsEnabled true)
    (ok (print {
      notification: "intialize-contract",
      payload: (get-redemption-info),
    }))
  )
)

(define-public (redeem-mia (amountUMia uint))
  (let (
      ;; balances for user
      (userAddress tx-sender)
      (balanceV1 (unwrap!
        (contract-call? 'SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27.miamicoin-token
          get-balance userAddress
        )
        ERR_BALANCE_NOT_FOUND
      ))
      (balanceV2 (unwrap!
        (contract-call?
          'SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2
          get-balance userAddress
        )
        ERR_BALANCE_NOT_FOUND
      ))
      ;; previous redemptions
      (redemptionClaimed (default-to {
        uMia: u0,
        uStx: u0,
      }
        (map-get? RedemptionClaims userAddress)
      ))
      ;; limit to max amount per transaction and actual balance
      (maxAmountUMia (if (> amountUMia MAX_PER_TRANSACTION)
        MAX_PER_TRANSACTION
        amountUMia
      ))
      (redemptionAmountUMiaV1 (if (> maxAmountUMia (* balanceV1 MICRO_CITYCOINS))
        (* balanceV1 MICRO_CITYCOINS)
        maxAmountUMia
      ))
      (remainingAmountUMia (- maxAmountUMia redemptionAmountUMiaV1))
      (redemptionAmountUMiaV2 (if (> remainingAmountUMia balanceV2)
        balanceV2
        remainingAmountUMia
      ))
      (redemptionTotalUMia (+ redemptionAmountUMiaV1 redemptionAmountUMiaV2))
      ;; calculate redemption amount in uSTX
      (redemptionAmountUStx (try! (get-redemption-for-balance redemptionTotalUMia)))
    )
    ;; check if redemptions are enabled
    (asserts! (var-get redemptionsEnabled) ERR_NOT_ENABLED)
    ;; check that redemption amount is > 0
    (asserts! (> redemptionAmountUStx u0) ERR_NOTHING_TO_REDEEM)
    ;; burn MIA tokens
    (try! (contract-call? 'SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27.miamicoin-token
      burn redemptionAmountUMiaV1 userAddress
    ))
    (try! (contract-call? 'SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2
      burn redemptionAmountUMiaV2 userAddress
    ))
    ;; transfer STX
    (try! (contract-call?
      'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3
      withdraw-stx redemptionAmountUStx userAddress
    ))
    ;; update redemption claims
    (var-set totalRedeemed (+ (var-get totalRedeemed) redemptionTotalUMia))
    (var-set totalTransferred (+ (var-get totalTransferred) redemptionAmountUStx))
    (map-set RedemptionClaims userAddress {
      uMia: (+ (get uMia redemptionClaimed) redemptionTotalUMia),
      uStx: (+ (get uStx redemptionClaimed) redemptionAmountUStx),
    })
    ;; print redemption info
    (print {
      notification: "contract-redemption",
      payload: (get-redemption-info),
    })
    ;; print user redemption info
    (print {
      notification: "user-redemption",
      payload: (get-user-redemption-info userAddress),
    })
    ;; return redemption amount
    (ok {
      uStx: redemptionAmountUStx,
      uMia: redemptionTotalUMia,
    })
  )
)

;; READ ONLY FUNCTIONS

(define-read-only (is-redemption-enabled)
  (var-get redemptionsEnabled)
)

(define-read-only (get-redemption-current-balance)
  (stx-get-balance 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3)
)

(define-read-only (get-redemption-ratio)
  REDEMPTION_RATIO
)

(define-read-only (get-total-redeemed)
  (var-get totalRedeemed)
)

(define-read-only (get-total-transferred)
  (var-get totalTransferred)
)

;; aggregate all exposed vars above
(define-read-only (get-redemption-info)
  {
    redemptionsEnabled: (is-redemption-enabled),
    currentContractBalance: (get-redemption-current-balance),
    redemptionRatio: REDEMPTION_RATIO,
    totalRedeemed: (get-total-redeemed),
    totalTransferred: (get-total-transferred),
  }
)

(define-read-only (get-user-redemption-info (user principal))
  { totalRedeemed: (map-get? RedemptionClaims user) }
)

(define-read-only (get-redemption-for-balance (balance uint))
  (let (
      (redemptionAmountScaled (* REDEMPTION_RATIO balance))
      (redemptionAmount (/ redemptionAmountScaled REDEMPTION_SCALE_FACTOR))
      (contractCurrentBalance (get-redemption-current-balance))
    )
    (if (< redemptionAmount contractCurrentBalance)
      ;; if redemption amount is less than contract balance, return redemption amount
      (ok redemptionAmount)
      ;; if redemption amount is greater than contract balance, thrown an error
      ERR_NOT_ENOUGH_FUNDS_IN_CONTRACT
    )
  )
)
