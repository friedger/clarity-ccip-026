;; Title: CCD013 - MIA Burn To Exit
;; Version: 1.0.0
;; Summary: An extension that allows users to redeem MIA tokens for a portion of the MIA rewards treasury.
;; Description: An extension that provides the ability to claim a portion of the MIA rewards treasury in exchange for MIA tokens.

;; TRAITS
(impl-trait 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.extension-trait.extension-trait)

;; CONSTANTS

;; error codes
(define-constant ERR_UNAUTHORIZED (err u13000))
(define-constant ERR_PANIC (err u13001))
(define-constant ERR_GETTING_TOTAL_SUPPLY (err u13002))
(define-constant ERR_GETTING_REDEMPTION_BALANCE (err u13003))
(define-constant ERR_ALREADY_ENABLED (err u13004))
(define-constant ERR_NOT_ENABLED (err u13005))
(define-constant ERR_BALANCE_NOT_FOUND (err u13006))
(define-constant ERR_NOTHING_TO_REDEEM (err u13007))
(define-constant ERR_SUPPLY_CALCULATION (err u13009))

;; helpers
(define-constant SELF (as-contract tx-sender))
(define-constant MICRO_CITYCOINS (pow u10 u6)) ;; 6 decimal places
(define-constant REDEMPTION_SCALE_FACTOR (pow u10 u6)) ;; 6 decimal places
(define-constant MAX_PER_TRANSACTION (* u10000000 MICRO_CITYCOINS)) ;; max 10m MIA per transaction

;; DATA VARS
(define-data-var redemptionsEnabled bool false)
(define-data-var blockHeight uint u0)
(define-data-var totalSupply uint u0)
(define-data-var contractBalance uint u0)
(define-data-var redemptionRatio uint u0)
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
(define-public (initialize-redemption)
  (let
    (
      (miaTotalSupplyV1 (unwrap! (contract-call? 'SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27.miamicoin-token get-total-supply) ERR_PANIC))
      (miaTotalSupplyV2 (unwrap! (contract-call? 'SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2 get-total-supply) ERR_PANIC))
      (miaTotalSupply (+ (* miaTotalSupplyV1 MICRO_CITYCOINS) miaTotalSupplyV2))
      (miaRedemptionBalance (get-redemption-current-balance))
      (miaRedemptionRatio (calculate-redemption-ratio miaRedemptionBalance miaTotalSupply))
    )
    ;; check if sender is DAO or extension
    (try! (is-dao-or-extension))
    ;; check that total supply is greater than 0
    (asserts! (> miaTotalSupply u0) ERR_GETTING_TOTAL_SUPPLY)
    ;; check that redemption balance is greater than 0
    (asserts! (> miaRedemptionBalance u0) ERR_GETTING_REDEMPTION_BALANCE)
    ;; check that redemption ratio has a value
    (asserts! (is-some miaRedemptionRatio) ERR_SUPPLY_CALCULATION)
    ;; check if redemptions are already enabled
    (asserts! (not (var-get redemptionsEnabled)) ERR_ALREADY_ENABLED)
    ;; revoke delegation before recording values
    (try! (contract-call?
      'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3
      revoke-delegate-stx
    ))
    ;; record current block height
    (var-set blockHeight stacks-block-height)
    ;; record total supply at block height
    (var-set totalSupply miaTotalSupply)
    ;; record contract balance at block height
    (var-set contractBalance miaRedemptionBalance)
    ;; calculate redemption ratio
    (var-set redemptionRatio (unwrap-panic miaRedemptionRatio))
    ;; set redemptionsEnabled to true, can only run once
    (var-set redemptionsEnabled true)
    ;; print redemption info
    (ok (print {
      notification: "initialize-contract",
      payload: (get-redemption-info)
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
      ;; v1 amount in micro MIA
      (redemptionAmountUMiaV1 (if (> maxAmountUMia (* balanceV1 MICRO_CITYCOINS))
        (* balanceV1 MICRO_CITYCOINS)
        maxAmountUMia
      ))
      (redemptionV1InMia (/ redemptionAmountUMiaV1 MICRO_CITYCOINS))
      ;; v2 amount in micro MIA
      (remainingAmountUMia (- maxAmountUMia redemptionAmountUMiaV1))
      (redemptionAmountUMiaV2 (if (> remainingAmountUMia balanceV2)
        balanceV2
        remainingAmountUMia
      ))
      (redemptionTotalUMia (+ redemptionAmountUMiaV1 redemptionAmountUMiaV2))
      ;; calculate redemption amount in uSTX
      (redemptionAmount (get-redemption-for-balance redemptionTotalUMia))
      (redemptionAmountUStx (default-to u0 redemptionAmount))
    )
    ;; check if redemptions are enabled
    (asserts! (var-get redemptionsEnabled) ERR_NOT_ENABLED)
    ;; check that user has at least one positive balance
    (asserts! (> (+ balanceV1 balanceV2) u0) ERR_BALANCE_NOT_FOUND)
    ;; check that contract has a positive balance
    (asserts! (> (get-redemption-current-balance) u0) ERR_NOTHING_TO_REDEEM)
    ;; check that redemption amount is > 0
    (asserts! (and (is-some redemptionAmount) (> redemptionAmountUStx u0)) ERR_NOTHING_TO_REDEEM)
    ;; burn MIA tokens v1
    (and
      (> redemptionV1InMia u0)
      (try! (contract-call?
        'SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-core-v1-patch
        burn-mia-v1 redemptionV1InMia userAddress
      ))
    )
    ;; burn MIA tokens v2   
    (and
      (> redemptionAmountUMiaV2 u0)
      (try! (contract-call?
        'SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2 burn
        redemptionAmountUMiaV2 userAddress
      ))
    )
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
      uMiaV2: redemptionAmountUMiaV2,
      miaV1: redemptionV1InMia,
    })
  )
)

;; READ ONLY FUNCTIONS

(define-read-only (is-redemption-enabled)
  (var-get redemptionsEnabled)
)

(define-read-only (get-redemption-block-height)
  (var-get blockHeight)
)

(define-read-only (get-redemption-total-supply)
  (var-get totalSupply)
)

(define-read-only (get-redemption-contract-balance)
  (var-get contractBalance)
)

(define-read-only (get-redemption-current-balance)
  (stx-get-balance 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3)
)

(define-read-only (get-redemption-ratio)
  (var-get redemptionRatio)
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
    blockHeight: (get-redemption-block-height),
    totalSupply: (get-redemption-total-supply),
    contractBalance: (get-redemption-contract-balance),
    currentContractBalance: (get-redemption-current-balance),
    redemptionRatio: (get-redemption-ratio),
    totalRedeemed: (get-total-redeemed),
    totalTransferred: (get-total-transferred),
  }
)

(define-read-only (get-mia-balances (address principal))
  (let
    (
      (balanceV1 (unwrap! (contract-call? 'SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27.miamicoin-token get-balance address) ERR_BALANCE_NOT_FOUND))
      (balanceV2 (unwrap! (contract-call? 'SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2 get-balance address) ERR_BALANCE_NOT_FOUND))
      (totalBalance (+ (* balanceV1 MICRO_CITYCOINS) balanceV2))
    )
    (ok {
      address: address,
      balanceV1: balanceV1,
      balanceV2: balanceV2,
      totalBalance: totalBalance
    })
  )
)

(define-read-only (get-user-redemption-info (user principal))
  (let
    (
      (miaBalances (try! (get-mia-balances user)))
      (redemptionAmount (default-to u0 (get-redemption-for-balance (get totalBalance miaBalances))))
      (redemptionClaims (default-to { uMia: u0, uStx: u0 } (map-get? RedemptionClaims user)))
    )
    (ok {
      address: user,
      miaBalances: miaBalances,
      redemptionAmount: redemptionAmount,
      redemptionClaims: redemptionClaims
    })
  )
)

(define-read-only (get-redemption-for-balance (balance uint))
  (let
    (
      (redemptionAmountScaled (* (var-get redemptionRatio) balance))
      (redemptionAmount (/ redemptionAmountScaled REDEMPTION_SCALE_FACTOR))
      (contractCurrentBalance (get-redemption-current-balance))
    )
    (if (> redemptionAmount u0)
      (if (< redemptionAmount contractCurrentBalance)
        ;; if redemption amount is less than contract balance, return redemption amount
        (some redemptionAmount)
        ;; if redemption amount is greater than contract balance, return contract balance
        (some contractCurrentBalance)
      )
      ;; if redemption amount is 0, return none
      none
    )
  )
)

;; PRIVATE FUNCTIONS

;; CREDIT: ALEX math-fixed-point-16.clar

(define-private (scale-up (a uint))
  (* a REDEMPTION_SCALE_FACTOR)
)

(define-private (scale-down (a uint))
  (/ a REDEMPTION_SCALE_FACTOR)
)

(define-private (calculate-redemption-ratio (balance uint) (supply uint))
  (if (or (is-eq supply u0) (is-eq balance u0))
    none
    (some (/ (* balance REDEMPTION_SCALE_FACTOR) supply))
  )
)
