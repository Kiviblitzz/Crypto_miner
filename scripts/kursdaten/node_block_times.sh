#!/usr/bin/env bash
# Skizze (hier NICHT getestet: kein P2P-Zugang im Container).
# Block-Zeitstempel aller Blöcke aus einem EIGENEN Bitcoin-Core-Knoten -> CSV height,time.
# Knoten: bitcoind -prune=10000 -rest=1   (pruned reicht; Header bleiben vollständig erhalten).
# Variante A (Knoten voll synchronisiert): REST, 2000 Header je Abruf, wie bitcoin-data/block-arrival-times (CC0).
set -euo pipefail
HOST="http://127.0.0.1:8332"
HASH=$(curl -s "$HOST/rest/blockhashbyheight/0.json" | jq -r .blockhash)
while [ -n "$HASH" ] && [ "$HASH" != "null" ]; do
  RESP=$(curl -s "$HOST/rest/headers/$HASH.json?count=2000")
  echo "$RESP" | jq -r '.[] | "\(.height),\(.time)"'
  NEXT=$(echo "$RESP" | jq -r '.[-1].nextblockhash // empty')
  [ "$NEXT" = "$HASH" ] && break; HASH=$NEXT
done
# Variante B (nur Header synchronisiert, Minuten statt Tage): rückwärts ab der Header-Spitze
#   TIP=$(bitcoin-cli getchaintips | jq -r 'map(select(.status=="headers-only" or .status=="active"))|max_by(.height).hash')
#   dann wiederholt: bitcoin-cli getblockheader $TIP  -> height,time,previousblockhash  (≈950k RPC-Aufrufe)
