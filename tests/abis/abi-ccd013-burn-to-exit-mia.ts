export const abiCcd013BurnToExitMia = {
  "functions": [
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
      "name": "initialize",
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
                      "length": 18
                    }
                  }
                },
                {
                  "name": "payload",
                  "type": {
                    "tuple": [
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
          "response": {
            "ok": "uint128",
            "error": "uint128"
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
          "tuple": [
            {
              "name": "totalRedeemed",
              "type": {
                "optional": {
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
            }
          ]
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
      "name": "ERR_NOT_ENOUGH_FUNDS_IN_CONTRACT",
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
      "name": "REDEMPTION_RATIO",
      "type": "uint128",
      "access": "constant"
    },
    {
      "name": "REDEMPTION_SCALE_FACTOR",
      "type": "uint128",
      "access": "constant"
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
  "epoch": "Epoch33",
  "clarity_version": "Clarity4"
} as const;
