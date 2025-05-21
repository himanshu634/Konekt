import asyncio
import json
import logging
import os
import uuid

from aiohttp import web
from aiortc import RTCIceCandidate, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaPlayer, MediaRelay

ROOT = os.path.dirname(__file__)
logger = logging.getLogger("pc")
pcs = set()
relay = MediaRelay()

async def index(request):
    content = open(os.path.join(ROOT, "index.html"), "r").read()
    return web.Response(content_type="text/html", text=content)

async def javascript(request):
    content = open(os.path.join(ROOT, "client.js"), "r").read()
    return web.Response(content_type="application/javascript", text=content)

async def offer(request):
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pc_id = "PeerConnection(%s)" % uuid.uuid4()
    pcs.add(pc)

    def log_info(msg, *args):
        logger.info(pc_id + " " + msg, *args)

    log_info("Created for %s", request.remote)

    # prepare local media
    player = MediaPlayer(os.path.join(ROOT, "demo-instruct.wav"))
    if args.write_audio:
        recorder = MediaRecorder(args.write_audio)
    else:
        recorder = None

    @pc.on("datachannel")
    def on_datachannel(channel):
        @channel.on("message")
        def on_message(message):
            if isinstance(message, str) and message.startswith("ping"):
                channel.send("pong" + message[4:])

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        log_info("Connection state is %s", pc.connectionState)
        if pc.connectionState == "failed":
            await pc.close()
            pcs.discard(pc)

    @pc.on("track")
    def on_track(track):
        log_info("Track %s received", track.kind)

        if track.kind == "audio":
            pc.addTrack(player.audio)
            if recorder:
                recorder.addTrack(track)
        elif track.kind == "video":
            pc.addTrack(
                VideoTransformTrack(
                    relay.subscribe(track), transform=params["video_transform"]
                )
            )
            if recorder:
                recorder.addTrack(relay.subscribe(track))

        @track.on("ended")
        async def on_ended():
            log_info("Track %s ended", track.kind)
            await recorder.stop()

    # handle offer
    await pc.setRemoteDescription(offer)
    await recorder.start()

    # send answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return web.Response(
        content_type="application/json",
        text=json.dumps(
            {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
        ),
    )

async def ws_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    pc_id = "PeerConnection(%s)" % uuid.uuid4()
    pc = RTCPeerConnection()
    pcs.add(pc)

    def log_info(msg, *args):
        logger.info(pc_id + " " + msg, *args)

    log_info("Created for %s", request.remote)

    @pc.on("icecandidate")
    async def on_icecandidate(candidate):
        if candidate:
            await ws.send_json({
                "type": "candidate",
                "candidate": candidate.to_json()
            })

    @pc.on("track")
    def on_track(track):
        log_info(f"Track {track.kind} received")
        # Simple relay: send back the track we receive
        # In a real application, you might want to send to other peers
        # or process the media.
        if track.kind == "video":
            pc.addTrack(relay.subscribe(track))
        elif track.kind == "audio":
             pc.addTrack(relay.subscribe(track))


        @track.on("ended")
        async def on_ended():
            log_info(f"Track {track.kind} ended")

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        log_info(f"Connection state is {pc.connectionState}")
        if pc.connectionState == "failed" or pc.connectionState == "closed" or pc.connectionState == "disconnected":
            if pc in pcs:
                pcs.discard(pc)
            await pc.close()


    async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
            data = json.loads(msg.data)
            log_info(f"Received WebSocket message: {data['type']}")

            if data["type"] == "offer":
                offer_desc = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
                await pc.setRemoteDescription(offer_desc)
                answer_desc = await pc.createAnswer()
                await pc.setLocalDescription(answer_desc)
                await ws.send_json({
                    "type": "answer",
                    "sdp": pc.localDescription.sdp
                })
            elif data["type"] == "answer":
                answer_desc = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
                await pc.setRemoteDescription(answer_desc)
            elif data["type"] == "candidate":
                candidate = RTCIceCandidate.from_json(data["candidate"])
                await pc.addIceCandidate(candidate)
            elif data["type"] == "bye":
                log_info("Client said bye, closing connection")
                if pc in pcs:
                    pcs.discard(pc)
                await pc.close()
                # No need to send 'bye' back via WebSocket if client initiated
        elif msg.type == web.WSMsgType.ERROR:
            log_info(f"WebSocket connection closed with exception {ws.exception()}")

    log_info("WebSocket connection closed")
    if pc in pcs:
        pcs.discard(pc)
    await pc.close()
    return ws


async def on_shutdown(app):
    # close peer connections
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Command line arguments for video transform and audio recording (optional)
    # These are not strictly necessary for the basic demo but are often part of aiortc examples.
    # You might want to remove them or make them configurable if not needed.
    import argparse
    parser = argparse.ArgumentParser(description="WebRTC audio / video / data-channels demo")
    parser.add_argument("--cert-file", help="SSL certificate file (for HTTPS)")
    parser.add_argument("--key-file", help="SSL key file (for HTTPS)")
    parser.add_argument("--port", type=int, default=8080, help="Port for HTTP server (default: 8080)")
    parser.add_argument("--verbose", "-v", action="count")
    parser.add_argument("--write-audio", help="Write received audio to a file (WAV)")
    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)
        
    if args.cert_file:
        import ssl
        ssl_context = ssl.SSLContext()
        ssl_context.load_cert_chain(args.cert_file, args.key_file)
    else:
        ssl_context = None

    app = web.Application()
    app.on_shutdown.append(on_shutdown)
    app.router.add_get("/", index)
    # The client.js route was in the original example but we embedded JS in HTML.
    # If you separate JS, uncomment next line.
    # app.router.add_get("/client.js", javascript) 
    # The /offer route was for HTTP based signalling, we are using WebSockets.
    # If you want to support both, uncomment next line.
    # app.router.add_post("/offer", offer) 
    app.router.add_get("/ws", ws_handler) # Add WebSocket handler route

    web.run_app(app, access_log=None, port=args.port, ssl_context=ssl_context)
