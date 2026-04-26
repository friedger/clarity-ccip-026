import { useEffect, useMemo, useState } from "react";
import { Cl, serializeCV } from "@stacks/transactions";
import { Stat } from "../components/Stat";
import { TermsNotice } from "../components/TermsGate";
import { Toggle } from "../components/Toggle";
import {
  CCD013,
  FAST_POOL,
  MAX_PER_TX_UMIA,
  MIA_REWARDS_TREASURY,
} from "../lib/config";
import type { RedemptionInfo, UserRedemption } from "../lib/contracts";
import {
  deriveFastPoolAmount,
  recommendedUstx,
  RESERVE_USTX,
} from "../lib/fastPool";
import {
  formatUMia,
  formatUStx,
  formatUstxAsStxInput,
  shortAddress,
} from "../lib/format";
import { buildRedeemPostConditions } from "../lib/postConditions";
import { getCcd013, getReadOnlyClient } from "../lib/services";
import { callContract, useWallet } from "../lib/wallet";

export function BurnExitPage() {
  const wallet = useWallet();
  const [info, setInfo] = useState<RedemptionInfo | null>(null);
  const [treasuryStx, setTreasuryStx] = useState<bigint | null>(null);
  const [user, setUser] = useState<UserRedemption | null>(null);
  const [stacking, setStacking] = useState<{
    locked: bigint;
    unlockHeight: number;
    balance: bigint;
  } | null>(null);
  const [treasuryStacking, setTreasuryStacking] = useState<{
    locked: bigint;
    unlockHeight: number;
    balance: bigint;
  } | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [stackTxid, setStackTxid] = useState<string | null>(null);
  const [autoCompound, setAutoCompound] = useState(true);
  const [delegateInput, setDelegateInput] = useState("");
  const [delegateInputDirty, setDelegateInputDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const svc = getCcd013();
    const client = getReadOnlyClient();
    (async () => {
      try {
        const [r, t, ts] = await Promise.all([
          svc.getRedemptionInfo().catch(() => null),
          svc.getRewardsTreasuryStx().catch(() => null),
          client
            .fetchAccount(
              `${MIA_REWARDS_TREASURY.address}.${MIA_REWARDS_TREASURY.name}`,
            )
            .catch(() => null),
        ]);
        if (cancelled) return;
        setInfo(r);
        setTreasuryStx(t);
        setTreasuryStacking(ts);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!wallet.address) {
      setUser(null);
      setStacking(null);
      return;
    }
    const svc = getCcd013();
    const client = getReadOnlyClient();
    (async () => {
      try {
        const [u, s] = await Promise.all([
          svc.getUserRedemptionInfo(
            wallet.address!,
            amountInput ? parseUmia(amountInput) : undefined,
          ),
          client.fetchAccount(wallet.address!),
        ]);
        setUser(u);
        setStacking(s);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [wallet.address, amountInput]);

  async function redeem() {
    if (!wallet.address || !user) return;
    setErr(null);
    setTxid(null);
    if (!CCD013.address) {
      setErr("Deployer address not configured.");
      return;
    }
    if (user.burnUmia === 0n) {
      setErr("Nothing to redeem at this amount.");
      return;
    }
    setBusy(true);
    try {
      const pcs = buildRedeemPostConditions({
        userAddress: wallet.address,
        burnV1Mia: user.burnV1,
        burnV2Umia: user.burnV2,
        redemptionUstx: user.redemptionUstx,
      });
      const result = await callContract({
        contract: `${CCD013.address}.${CCD013.name}`,
        functionName: "redeem-mia",
        functionArgs: [`0x${serializeCV(Cl.uint(user.burnUmia))}`],
        postConditions: pcs,
        postConditionMode: "deny",
      });
      if (result.txid) setTxid(result.txid);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const projectedUstx = useMemo(
    () => (stacking?.balance ?? 0n) + (user?.redemptionUstx ?? 0n),
    [stacking?.balance, user?.redemptionUstx],
  );
  const recommendedDelegateUstx = recommendedUstx(projectedUstx);

  // Prefill the manual amount input when balances first load. Don't clobber
  // edits the user has already made.
  useEffect(() => {
    if (delegateInputDirty) return;
    if (recommendedDelegateUstx === 0n) return;
    setDelegateInput(formatUstxAsStxInput(recommendedDelegateUstx));
  }, [recommendedDelegateUstx, delegateInputDirty]);

  const delegateAmount = useMemo(
    () =>
      deriveFastPoolAmount({
        autoCompound,
        inputStx: delegateInput,
        availableUstx: projectedUstx,
      }),
    [autoCompound, delegateInput, projectedUstx],
  );

  async function stackWithFastPool() {
    if (!wallet.address) return;
    setErr(null);
    setStackTxid(null);
    if (delegateAmount.error) {
      setErr(delegateAmount.error);
      return;
    }
    if (delegateAmount.ustx === 0n) {
      setErr("Nothing to delegate.");
      return;
    }
    setBusy(true);
    try {
      // delegate-stx(amount, delegate-to, until-burn-ht, pox-addr)
      // No PC list needed: delegate-stx writes a delegation row, no asset
      // transfer happens. Deny mode is still correct because nothing moves.
      const args = [
        Cl.uint(delegateAmount.ustx),
        Cl.principal(`${FAST_POOL.address}.${FAST_POOL.name}`),
        Cl.none(),
        Cl.none(),
      ];
      const result = await callContract({
        contract: `${FAST_POOL.address}.${FAST_POOL.name}`,
        functionName: "delegate-stx",
        functionArgs: args.map((a) => `0x${serializeCV(a)}`),
        postConditionMode: "deny",
      });
      if (result.txid) setStackTxid(result.txid);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const ratioStxPerMia = info && info.ratio > 0n
    ? Number(info.ratio) / 1_000_000
    : 0;

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-tag">Redemption · Miami</div>
        <h1>Burn MIA · Receive STX</h1>
        <p className="hero-lede">
          The fixed redemption ratio was sealed at initialization. Burns v1
          first, then v2, and receive STX from the rewards treasury in one atomic
          transaction.
        </p>
      </section>

      <section className="grid stats-grid">
        <Stat
          label="Redemption enabled"
          value={info ? (info.enabled ? "Yes" : "No") : "..."}
          tone={info?.enabled ? "yes" : "warn"}
        />
        <Stat
          label="Ratio (STX per MIA)"
          value={ratioStxPerMia.toFixed(6)}
          hint={info ? `raw: ${info.ratio.toString()}` : undefined}
        />
        <Stat
          label="Treasury unlocked STX"
          value={treasuryStx == null ? "..." : `${formatUStx(treasuryStx)}`}
          hint={`${MIA_REWARDS_TREASURY.address}.${MIA_REWARDS_TREASURY.name}`}
        />
        <Stat
          label="Total redeemed"
          value={info ? `${formatUMia(info.totalRedeemed, 0)} MIA` : "..."}
          hint={
            info ? `→ ${formatUStx(info.totalTransferred)} STX paid` : undefined
          }
        />
      </section>

      <section className="grid two-col">
        <div className="card">
          <h2>Your position</h2>
          {!wallet.address && (
            <>
              <p className="muted">
                Connect a wallet to see your MIA balances and a personalized
                redemption preview. The numbers below are sample math at the
                current ratio.
              </p>
              <div className="kv">
                <div>Example: burn 1,000 MIA</div>
                <strong>
                  {info && info.ratio > 0n
                    ? `${formatUStx((info.ratio * 1_000n * 1_000_000n) / 1_000_000n)} STX`
                    : "..."}
                </strong>
              </div>
              <div className="kv">
                <div>Example: burn 100,000 MIA</div>
                <strong>
                  {info && info.ratio > 0n
                    ? `${formatUStx((info.ratio * 100_000n * 1_000_000n) / 1_000_000n)} STX`
                    : "..."}
                </strong>
              </div>
              <button
                className="btn btn-primary full"
                onClick={wallet.connect}
              >
                Connect wallet
              </button>
            </>
          )}
          {wallet.address && user && (
            <>
              <div className="kv">
                <div>Address</div>
                <code className="mono">{shortAddress(wallet.address)}</code>
              </div>
              <div className="kv">
                <div>MIA v1</div>
                <strong>{user.v1mia.toString()} MIA</strong>
              </div>
              <div className="kv">
                <div>MIA v2</div>
                <strong>{formatUMia(user.v2umia, 6)} MIA</strong>
              </div>
              <div className="kv kv-total">
                <div>Combined (uMIA)</div>
                <strong>{formatUMia(user.totalUmia, 6)} MIA</strong>
              </div>
              {user.claimedUmia > 0n && (
                <div className="kv dim">
                  <div>Already redeemed</div>
                  <span>
                    {formatUMia(user.claimedUmia, 0)} MIA →{" "}
                    {formatUStx(user.claimedUstx)} STX
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h2>Redeem</h2>
          {info?.enabled === false && (
            <p className="warn">
              Redemptions are not enabled. The proposal must pass and execute
              first.
            </p>
          )}
          <label className="field">
            <span>Amount (uMIA, leave blank for full balance)</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder={user ? user.totalUmia.toString() : "0"}
              value={amountInput}
              onChange={(e) =>
                setAmountInput(e.target.value.replace(/[^0-9]/g, ""))
              }
            />
          </label>
          <div className="kv">
            <div>Burn v1</div>
            <span>{user ? `${user.burnV1} MIA` : "..."}</span>
          </div>
          <div className="kv">
            <div>Burn v2</div>
            <span>{user ? `${formatUMia(user.burnV2, 6)} MIA` : "..."}</span>
          </div>
          <div className="kv kv-total">
            <div>You receive</div>
            <strong>
              {user ? `${formatUStx(user.redemptionUstx)} STX` : "..."}
            </strong>
          </div>
          {user && user.burnUmia > MAX_PER_TX_UMIA && (
            <p className="muted small">
              Capped to 10M MIA per transaction. Repeat to redeem more.
            </p>
          )}
          <button
            className="btn btn-primary full"
            disabled={busy || !user || user.burnUmia === 0n}
            onClick={redeem}
          >
            {busy ? "Submitting…" : "Burn & redeem"}
          </button>
          <TermsNotice />
          {err && <p className="error">{err}</p>}
          {txid && (
            <p className="success">
              Submitted ·{" "}
              <a
                className="link"
                href={`https://explorer.hiro.so/txid/${txid}?chain=mainnet`}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(txid, 10, 6)}
              </a>
            </p>
          )}
        </div>
      </section>

      <section className="grid two-col">
        <div className="card">
          <h2>Stacking state</h2>
          <p className="muted small">
            After execute, ccd013 calls{" "}
            <code>revoke-delegate-stx</code> on the rewards treasury so STX
            unlocks for redemption.
          </p>
          <div className="kv">
            <div>Treasury locked</div>
            <strong>
              {treasuryStacking
                ? `${formatUStx(treasuryStacking.locked)} STX`
                : "..."}
            </strong>
          </div>
          <div className="kv">
            <div>Treasury unlock height</div>
            <span>
              {treasuryStacking?.unlockHeight
                ? treasuryStacking.unlockHeight.toString()
                : "..."}
            </span>
          </div>
          <div className="kv">
            <div>Treasury delegation</div>
            <strong>
              {info?.enabled
                ? "Revoked ✓"
                : treasuryStacking?.locked && treasuryStacking.locked > 0n
                  ? "Active (pre-execute)"
                  : "..."}
            </strong>
          </div>
          {stacking && wallet.address && (
            <>
              <div className="kv kv-total">
                <div>Your STX balance</div>
                <strong>{formatUStx(stacking.balance)} STX</strong>
              </div>
              <div className="kv">
                <div>Your locked (stacked)</div>
                <strong>{formatUStx(stacking.locked)} STX</strong>
              </div>
              <div className="kv">
                <div>Your unlock height</div>
                <span>
                  {stacking.unlockHeight === 0
                    ? "..."
                    : stacking.unlockHeight.toString()}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="card card-accent">
          <h2>Keep stacking with Fast Pool</h2>
          <p>
            Once you've redeemed, your STX can keep working. Fast Pool is the
            longest running, most transparent,
            non-custodial PoX-4 stacking pool: you delegate, they aggregate stacking
            slots, your tokens never leave your wallet.
          </p>

          <Toggle
            checked={autoCompound}
            onChange={setAutoCompound}
            label="Auto-compound rewards"
            hint={`Delegate 1,000m STX so Fast Pool can re-stack future rewards. Only your liquid balance minus ${formatUStx(RESERVE_USTX, 0)} STX (fee reserve) gets locked.`}
          />

          <label className="field">
            <span>
              Amount to delegate (STX)
              {!autoCompound && recommendedDelegateUstx > 0n && (
                <button
                  type="button"
                  className="field-action"
                  onClick={() => {
                    setDelegateInput(formatUstxAsStxInput(recommendedDelegateUstx));
                    setDelegateInputDirty(true);
                  }}
                >
                  Use {formatUStx(recommendedDelegateUstx, 2)}
                </button>
              )}
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder={
                autoCompound
                  ? "1,000,000,000"
                  : recommendedDelegateUstx > 0n
                    ? formatUstxAsStxInput(recommendedDelegateUstx)
                    : "0"
              }
              value={
                autoCompound
                  ? "1,000,000,000"
                  : delegateInput
              }
              onChange={(e) => {
                if (autoCompound) return;
                setDelegateInput(e.target.value.replace(/[^0-9.]/g, ""));
                setDelegateInputDirty(true);
              }}
              disabled={autoCompound}
              aria-disabled={autoCompound}
            />
          </label>

          <div className="kv">
            <div>You delegate</div>
            <strong>
              {formatUStx(delegateAmount.ustx, 0)} STX
              {autoCompound ? " (auto)" : ""}
            </strong>
          </div>
          <div className="kv">
            <div>Pool</div>
            <span className="mono small">
              {FAST_POOL.address}.{FAST_POOL.name}
            </span>
          </div>

          <button
            className="btn btn-accent full"
            disabled={
              busy ||
              !wallet.address ||
              delegateAmount.ustx === 0n ||
              !!delegateAmount.error
            }
            onClick={stackWithFastPool}
          >
            Delegate to Fast Pool
          </button>

          {delegateAmount.error && wallet.address && (
            <p className="warn small">{delegateAmount.error}</p>
          )}
          {stackTxid && (
            <p className="success">
              Delegation submitted ·{" "}
              <a
                className="link"
                href={`https://explorer.hiro.so/txid/${stackTxid}?chain=mainnet`}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(stackTxid, 10, 6)}
              </a>
            </p>
          )}
        </div>
      </section>

      <p className="page-foot">
        Independently verify the ratio, the burn split, and the post-conditions
        on the <a href="#/verify" className="link">Verify page</a>.
      </p>
    </main>
  );
}

function parseUmia(input: string): bigint | undefined {
  if (!input) return undefined;
  try {
    return BigInt(input);
  } catch {
    return undefined;
  }
}
