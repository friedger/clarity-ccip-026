export const abiCcip026MiamicoinBurnToExit = {
  "functions": [
    {
      "name": "fold-proof-step-inner",
      "access": "private",
      "args": [
        {
          "name": "idx",
          "type": "uint128"
        },
        {
          "name": "acc",
          "type": {
            "response": {
              "ok": {
                "tuple": [
                  {
                    "name": "current",
                    "type": {
                      "optional": {
                        "buffer": {
                          "length": 32
                        }
                      }
                    }
                  },
                  {
                    "name": "positions",
                    "type": {
                      "list": {
                        "type": "bool",
                        "length": 32
                      }
                    }
                  },
                  {
                    "name": "proof",
                    "type": {
                      "list": {
                        "type": {
                          "buffer": {
                            "length": 32
                          }
                        },
                        "length": 32
                      }
                    }
                  }
                ]
              },
              "error": "uint128"
            }
          }
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "tuple": [
                {
                  "name": "current",
                  "type": {
                    "optional": {
                      "buffer": {
                        "length": 32
                      }
                    }
                  }
                },
                {
                  "name": "positions",
                  "type": {
                    "list": {
                      "type": "bool",
                      "length": 32
                    }
                  }
                },
                {
                  "name": "proof",
                  "type": {
                    "list": {
                      "type": {
                        "buffer": {
                          "length": 32
                        }
                      },
                      "length": 32
                    }
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
      "name": "hash-leaf",
      "access": "private",
      "args": [
        {
          "name": "account",
          "type": "principal"
        },
        {
          "name": "field-id",
          "type": "uint128"
        },
        {
          "name": "amount",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "buffer": {
                "length": 32
              }
            },
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "hash-parent",
      "access": "private",
      "args": [
        {
          "name": "left",
          "type": {
            "buffer": {
              "length": 32
            }
          }
        },
        {
          "name": "right",
          "type": {
            "buffer": {
              "length": 32
            }
          }
        }
      ],
      "outputs": {
        "type": {
          "buffer": {
            "length": 32
          }
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
      "name": "update-city-votes",
      "access": "private",
      "args": [
        {
          "name": "cityId",
          "type": "uint128"
        },
        {
          "name": "voteAmount",
          "type": "uint128"
        },
        {
          "name": "vote",
          "type": "bool"
        },
        {
          "name": "changedVote",
          "type": "bool"
        }
      ],
      "outputs": {
        "type": "bool"
      }
    },
    {
      "name": "verify-proof",
      "access": "private",
      "args": [
        {
          "name": "leaf",
          "type": {
            "buffer": {
              "length": 32
            }
          }
        },
        {
          "name": "proof",
          "type": {
            "list": {
              "type": {
                "buffer": {
                  "length": 32
                }
              },
              "length": 32
            }
          }
        },
        {
          "name": "positions",
          "type": {
            "list": {
              "type": "bool",
              "length": 32
            }
          }
        },
        {
          "name": "expected-root",
          "type": {
            "buffer": {
              "length": 32
            }
          }
        }
      ],
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
      "name": "execute",
      "access": "public",
      "args": [
        {
          "name": "sender",
          "type": "principal"
        }
      ],
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
      "name": "set-snapshot-root",
      "access": "public",
      "args": [
        {
          "name": "root",
          "type": {
            "buffer": {
              "length": 32
            }
          }
        }
      ],
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
      "name": "vote-on-proposal",
      "access": "public",
      "args": [
        {
          "name": "vote",
          "type": "bool"
        },
        {
          "name": "scaledMiaVoteAmount",
          "type": "uint128"
        },
        {
          "name": "proof",
          "type": {
            "list": {
              "type": {
                "buffer": {
                  "length": 32
                }
              },
              "length": 32
            }
          }
        },
        {
          "name": "positions",
          "type": {
            "list": {
              "type": "bool",
              "length": 32
            }
          }
        }
      ],
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
      "name": "get-proposal-info",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "optional": {
            "tuple": [
              {
                "name": "hash",
                "type": {
                  "string-ascii": {
                    "length": 0
                  }
                }
              },
              {
                "name": "link",
                "type": {
                  "string-ascii": {
                    "length": 135
                  }
                }
              },
              {
                "name": "name",
                "type": {
                  "string-ascii": {
                    "length": 22
                  }
                }
              }
            ]
          }
        }
      }
    },
    {
      "name": "get-vote-period",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "optional": {
            "tuple": [
              {
                "name": "endBlock",
                "type": "uint128"
              },
              {
                "name": "length",
                "type": "uint128"
              },
              {
                "name": "startBlock",
                "type": "uint128"
              }
            ]
          }
        }
      }
    },
    {
      "name": "get-vote-total-mia",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "optional": {
            "tuple": [
              {
                "name": "totalAmountNo",
                "type": "uint128"
              },
              {
                "name": "totalAmountYes",
                "type": "uint128"
              },
              {
                "name": "totalVotesNo",
                "type": "uint128"
              },
              {
                "name": "totalVotesYes",
                "type": "uint128"
              }
            ]
          }
        }
      }
    },
    {
      "name": "get-vote-total-mia-or-default",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "tuple": [
            {
              "name": "totalAmountNo",
              "type": "uint128"
            },
            {
              "name": "totalAmountYes",
              "type": "uint128"
            },
            {
              "name": "totalVotesNo",
              "type": "uint128"
            },
            {
              "name": "totalVotesYes",
              "type": "uint128"
            }
          ]
        }
      }
    },
    {
      "name": "get-vote-totals",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "optional": {
            "tuple": [
              {
                "name": "mia",
                "type": {
                  "tuple": [
                    {
                      "name": "totalAmountNo",
                      "type": "uint128"
                    },
                    {
                      "name": "totalAmountYes",
                      "type": "uint128"
                    },
                    {
                      "name": "totalVotesNo",
                      "type": "uint128"
                    },
                    {
                      "name": "totalVotesYes",
                      "type": "uint128"
                    }
                  ]
                }
              },
              {
                "name": "totals",
                "type": {
                  "tuple": [
                    {
                      "name": "totalAmountNo",
                      "type": "uint128"
                    },
                    {
                      "name": "totalAmountYes",
                      "type": "uint128"
                    },
                    {
                      "name": "totalVotesNo",
                      "type": "uint128"
                    },
                    {
                      "name": "totalVotesYes",
                      "type": "uint128"
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    },
    {
      "name": "get-voter-info",
      "access": "read_only",
      "args": [
        {
          "name": "id",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": {
          "optional": {
            "tuple": [
              {
                "name": "mia",
                "type": "uint128"
              },
              {
                "name": "vote",
                "type": "bool"
              }
            ]
          }
        }
      }
    },
    {
      "name": "is-executable",
      "access": "read_only",
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
      "name": "is-vote-active",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "optional": "bool"
        }
      }
    }
  ],
  "variables": [
    {
      "name": "CCIP_026",
      "type": {
        "tuple": [
          {
            "name": "hash",
            "type": {
              "string-ascii": {
                "length": 0
              }
            }
          },
          {
            "name": "link",
            "type": {
              "string-ascii": {
                "length": 135
              }
            }
          },
          {
            "name": "name",
            "type": {
              "string-ascii": {
                "length": 22
              }
            }
          }
        ]
      },
      "access": "constant"
    },
    {
      "name": "ERR_CONSENSUS_ENCODING_FAILED",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_FOLD_FAILED",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_NOTHING_STACKED",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_NOT_ADMIN",
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
      "name": "ERR_PROOF_INVALID",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_PROPOSAL_NOT_ACTIVE",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_SAVING_VOTE",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_SNAPSHOT_NOT_SET",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_USER_NOT_FOUND",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_VOTED_ALREADY",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "ERR_VOTE_FAILED",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "MERKLE_LEAF_TAG",
      "type": {
        "buffer": {
          "length": 11
        }
      },
      "access": "constant"
    },
    {
      "name": "MERKLE_PARENT_TAG",
      "type": {
        "buffer": {
          "length": 13
        }
      },
      "access": "constant"
    },
    {
      "name": "MIA_ID",
      "type": "uint128",
      "access": "constant"
    },
    {
      "name": "PROOF_INDICES",
      "type": {
        "list": {
          "type": "uint128",
          "length": 32
        }
      },
      "access": "constant"
    },
    {
      "name": "VOTE_LENGTH",
      "type": "uint128",
      "access": "constant"
    },
    {
      "name": "VOTE_SCALE_FACTOR",
      "type": "uint128",
      "access": "constant"
    },
    {
      "name": "snapshotAdmin",
      "type": "principal",
      "access": "variable"
    },
    {
      "name": "snapshotMerkleRoot",
      "type": {
        "optional": {
          "buffer": {
            "length": 32
          }
        }
      },
      "access": "variable"
    },
    {
      "name": "voteActive",
      "type": "bool",
      "access": "variable"
    },
    {
      "name": "voteEnd",
      "type": "uint128",
      "access": "variable"
    },
    {
      "name": "voteStart",
      "type": "uint128",
      "access": "variable"
    }
  ],
  "maps": [
    {
      "name": "CityVotes",
      "key": "uint128",
      "value": {
        "tuple": [
          {
            "name": "totalAmountNo",
            "type": "uint128"
          },
          {
            "name": "totalAmountYes",
            "type": "uint128"
          },
          {
            "name": "totalVotesNo",
            "type": "uint128"
          },
          {
            "name": "totalVotesYes",
            "type": "uint128"
          }
        ]
      }
    },
    {
      "name": "UserVotes",
      "key": "uint128",
      "value": {
        "tuple": [
          {
            "name": "mia",
            "type": "uint128"
          },
          {
            "name": "vote",
            "type": "bool"
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
