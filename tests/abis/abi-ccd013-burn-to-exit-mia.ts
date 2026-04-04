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
                        "name": "block-height",
                        "type": "uint128"
                      },
                      {
                        "name": "current-contract-balance",
                        "type": "uint128"
                      },
                      {
                        "name": "mining-treasury-ustx",
                        "type": "uint128"
                      },
                      {
                        "name": "redemption-enabled",
                        "type": "bool"
                      },
                      {
                        "name": "redemption-ratio",
                        "type": "uint128"
                      },
                      {
                        "name": "total-redeemed",
                        "type": "uint128"
                      },
                      {
                        "name": "total-supply",
                        "type": "uint128"
                      },
                      {
                        "name": "total-transferred",
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
          "name": "amount-umia",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "tuple": [
                {
                  "name": "mia-v1",
                  "type": "uint128"
                },
                {
                  "name": "umia",
                  "type": "uint128"
                },
                {
                  "name": "umia-v2",
                  "type": "uint128"
                },
                {
                  "name": "ustx",
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
                  "name": "balance-v1-mia",
                  "type": "uint128"
                },
                {
                  "name": "balance-v2-umia",
                  "type": "uint128"
                },
                {
                  "name": "total-balance-umia",
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
      "name": "get-mining-treasury-balance",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-mining-treasury-total-balance",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
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
          "optional": {
            "tuple": [
              {
                "name": "umia",
                "type": "uint128"
              },
              {
                "name": "ustx",
                "type": "uint128"
              }
            ]
          }
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
              "name": "block-height",
              "type": "uint128"
            },
            {
              "name": "current-contract-balance",
              "type": "uint128"
            },
            {
              "name": "mining-treasury-ustx",
              "type": "uint128"
            },
            {
              "name": "redemption-enabled",
              "type": "bool"
            },
            {
              "name": "redemption-ratio",
              "type": "uint128"
            },
            {
              "name": "total-redeemed",
              "type": "uint128"
            },
            {
              "name": "total-supply",
              "type": "uint128"
            },
            {
              "name": "total-transferred",
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
        },
        {
          "name": "amount-umia",
          "type": {
            "optional": "uint128"
          }
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
                  "name": "burn-amount-umia",
                  "type": "uint128"
                },
                {
                  "name": "burn-amount-v1-mia",
                  "type": "uint128"
                },
                {
                  "name": "burn-amount-v2-umia",
                  "type": "uint128"
                },
                {
                  "name": "mia-balances",
                  "type": {
                    "tuple": [
                      {
                        "name": "address",
                        "type": "principal"
                      },
                      {
                        "name": "balance-v1-mia",
                        "type": "uint128"
                      },
                      {
                        "name": "balance-v2-umia",
                        "type": "uint128"
                      },
                      {
                        "name": "total-balance-umia",
                        "type": "uint128"
                      }
                    ]
                  }
                },
                {
                  "name": "redemption-amount-ustx",
                  "type": "uint128"
                },
                {
                  "name": "redemption-claims",
                  "type": {
                    "tuple": [
                      {
                        "name": "umia",
                        "type": "uint128"
                      },
                      {
                        "name": "ustx",
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
      "name": "ERR_INVALID_REDEMPTION_AMOUNT",
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
      "name": "ERR_ZERO_BALANCE",
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
      "name": "mining-treasury-ustx",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "redemption-block-height",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "redemption-ratio",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "redemptions-enabled",
      "type": "bool",
      "access": "variable"
    },
    {
      "name": "total-redeemed",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "total-supply",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "total-transferred",
      "type": "uint128",
      "access": "variable"
    }
  ],
  "maps": [
    {
      "name": "redemption-claims",
      "key": "principal",
      "value": {
        "tuple": [
          {
            "name": "umia",
            "type": "uint128"
          },
          {
            "name": "ustx",
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
