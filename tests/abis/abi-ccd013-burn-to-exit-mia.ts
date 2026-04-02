export const abiCcd013BurnToExitMia = {
  "functions": [
    {
      "name": "calculate-redemption-ratio",
      "access": "private",
      "args": [
        {
          "name": "balance",
          "type": "uint128"
        },
        {
          "name": "supply",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": {
          "optional": "uint128"
        }
      }
    },
    {
      "name": "scale-down",
      "access": "private",
      "args": [
        {
          "name": "a",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "scale-up",
      "access": "private",
      "args": [
        {
          "name": "a",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "callback",
      "access": "public",
      "args": [
        {
          "name": "sender",
          "type": "principal"
        },
        {
          "name": "memo",
          "type": {
            "buffer": {
              "length": 34
            }
          }
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "none"
          }
        }
      }
    },
    {
      "name": "initialize-redemption",
      "access": "public",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "tuple": [
                {
                  "name": "notification",
                  "type": {
                    "string-ascii": {
                      "length": 19
                    }
                  }
                },
                {
                  "name": "payload",
                  "type": {
                    "tuple": [
                      {
                        "name": "blockHeight",
                        "type": "uint128"
                      },
                      {
                        "name": "contractBalance",
                        "type": "uint128"
                      },
                      {
                        "name": "currentContractBalance",
                        "type": "uint128"
                      },
                      {
                        "name": "redemptionRatio",
                        "type": "uint128"
                      },
                      {
                        "name": "redemptionsEnabled",
                        "type": "bool"
                      },
                      {
                        "name": "totalRedeemed",
                        "type": "uint128"
                      },
                      {
                        "name": "totalSupply",
                        "type": "uint128"
                      },
                      {
                        "name": "totalTransferred",
                        "type": "uint128"
                      }
                    ]
                  }
                }
              ]
            },
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "is-dao-or-extension",
      "access": "public",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "redeem-mia",
      "access": "public",
      "args": [
        {
          "name": "amountUMia",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "tuple": [
                {
                  "name": "miaV1",
                  "type": "uint128"
                },
                {
                  "name": "uMia",
                  "type": "uint128"
                },
                {
                  "name": "uMiaV2",
                  "type": "uint128"
                },
                {
                  "name": "uStx",
                  "type": "uint128"
                }
              ]
            },
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "get-mia-balances",
      "access": "read_only",
      "args": [
        {
          "name": "address",
          "type": "principal"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "tuple": [
                {
                  "name": "address",
                  "type": "principal"
                },
                {
                  "name": "balanceV1",
                  "type": "uint128"
                },
                {
                  "name": "balanceV2",
                  "type": "uint128"
                },
                {
                  "name": "totalBalance",
                  "type": "uint128"
                }
              ]
            },
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "get-redemption-block-height",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-redemption-contract-balance",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-redemption-current-balance",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-redemption-for-balance",
      "access": "read_only",
      "args": [
        {
          "name": "balance",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": {
          "optional": "uint128"
        }
      }
    },
    {
      "name": "get-redemption-info",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "tuple": [
            {
              "name": "blockHeight",
              "type": "uint128"
            },
            {
              "name": "contractBalance",
              "type": "uint128"
            },
            {
              "name": "currentContractBalance",
              "type": "uint128"
            },
            {
              "name": "redemptionRatio",
              "type": "uint128"
            },
            {
              "name": "redemptionsEnabled",
              "type": "bool"
            },
            {
              "name": "totalRedeemed",
              "type": "uint128"
            },
            {
              "name": "totalSupply",
              "type": "uint128"
            },
            {
              "name": "totalTransferred",
              "type": "uint128"
            }
          ]
        }
      }
    },
    {
      "name": "get-redemption-ratio",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-redemption-total-supply",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-total-redeemed",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-total-transferred",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-user-redemption-info",
      "access": "read_only",
      "args": [
        {
          "name": "user",
          "type": "principal"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "tuple": [
                {
                  "name": "address",
                  "type": "principal"
                },
                {
                  "name": "miaBalances",
                  "type": {
                    "tuple": [
                      {
                        "name": "address",
                        "type": "principal"
                      },
                      {
                        "name": "balanceV1",
                        "type": "uint128"
                      },
                      {
                        "name": "balanceV2",
                        "type": "uint128"
                      },
                      {
                        "name": "totalBalance",
                        "type": "uint128"
                      }
                    ]
                  }
                },
                {
                  "name": "redemptionAmount",
                  "type": "uint128"
                },
                {
                  "name": "redemptionClaims",
                  "type": {
                    "tuple": [
                      {
                        "name": "uMia",
                        "type": "uint128"
                      },
                      {
                        "name": "uStx",
                        "type": "uint128"
                      }
                    ]
                  }
                }
              ]
            },
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "is-redemption-enabled",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "bool"
      }
    }
  ],
  "variables": [
    {
      "name": "ERR_ALREADY_ENABLED",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_BALANCE_NOT_FOUND",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_GETTING_REDEMPTION_BALANCE",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_GETTING_TOTAL_SUPPLY",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_NOTHING_TO_REDEEM",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_NOT_ENABLED",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_PANIC",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_SUPPLY_CALCULATION",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_UNAUTHORIZED",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "MAX_PER_TRANSACTION",
      "type": "uint128",
      "access": "constant"
    },
    {
      "name": "MICRO_CITYCOINS",
      "type": "uint128",
      "access": "constant"
    },
    {
      "name": "REDEMPTION_SCALE_FACTOR",
      "type": "uint128",
      "access": "constant"
    },
    {
      "name": "blockHeight",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "contractBalance",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "redemptionRatio",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "redemptionsEnabled",
      "type": "bool",
      "access": "variable"
    },
    {
      "name": "totalRedeemed",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "totalSupply",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "totalTransferred",
      "type": "uint128",
      "access": "variable"
    }
  ],
  "maps": [
    {
      "name": "RedemptionClaims",
      "key": "principal",
      "value": {
        "tuple": [
          {
            "name": "uMia",
            "type": "uint128"
          },
          {
            "name": "uStx",
            "type": "uint128"
          }
        ]
      }
    }
  ],
  "fungible_tokens": [],
  "non_fungible_tokens": [],
  "epoch": "Epoch34",
  "clarity_version": "Clarity5"
} as const;
