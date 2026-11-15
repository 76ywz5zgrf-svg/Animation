import asyncio, ssl, sys, edge_tts, edge_tts.communicate as c
c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
async def main(v, text, out, pitch="+0Hz", rate="+0%"):
    await edge_tts.Communicate(text, v, pitch=pitch, rate=rate).save(out)
asyncio.run(main(*sys.argv[1:]))
