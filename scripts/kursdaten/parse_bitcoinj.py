"""Parse bitcoinj checkpoint file (TXT CHECKPOINTS 1) -> CSV height,time,bits,difficulty,chainwork.
Format per line: base64(12 byte chainwork BE | 4 byte height BE | 80 byte block header)."""
import base64, struct, sys, csv, hashlib

def bits_to_target(bits):
    exp = bits >> 24; mant = bits & 0xFFFFFF
    return mant << (8 * (exp - 3))

MAX_TARGET = bits_to_target(0x1d00ffff)

def main(src, dst):
    lines = open(src).read().split()
    assert lines[0] == 'TXT' and lines[1] == 'CHECKPOINTS'
    nsig = int(lines[3]); n = int(lines[4 + nsig])
    rows = []
    for b64 in lines[5 + nsig:5 + nsig + n]:
        raw = base64.b64decode(b64)
        work = int.from_bytes(raw[:12], 'big'); height = struct.unpack('>I', raw[12:16])[0]
        hdr = raw[16:96]
        ver, = struct.unpack('<I', hdr[:4]); ts, bits, nonce = struct.unpack('<III', hdr[68:80])
        h = hashlib.sha256(hashlib.sha256(hdr).digest()).digest()[::-1].hex()
        target = bits_to_target(bits)
        assert int(h, 16) <= target, 'PoW check failed at %d' % height
        rows.append((height, ts, '%08x' % bits, MAX_TARGET / target, work, h))
    with open(dst, 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['height', 'time', 'bits', 'difficulty', 'chainwork', 'hash'])
        w.writerows(rows)
    print('rows', len(rows), 'first', rows[0][:4], 'last', rows[-1][:4])

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
