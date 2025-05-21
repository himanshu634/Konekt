# Basic WebRTC Video Chat Application

This project is a simple web application that demonstrates a 1-to-1 video chat using WebRTC, Python (`aiohttp` and `aiortc`), and vanilla JavaScript.

## Features

*   Local and remote video display.
*   Basic signaling mechanism using WebSockets.
*   Start, Call, and Hang Up controls.
*   STUN server for ICE candidate gathering (Google's public STUN server).

## Project Structure

*   `index.html`: The main HTML file for the client-side interface.
*   `server.py`: The Python backend server using `aiohttp` for web serving and WebSocket signaling, and `aiortc` for WebRTC peer connection handling.
*   `style.css`: (Optional) Contains styles for the `index.html` page.
*   `README.md`: This file.

## Prerequisites

*   Python 3.7+
*   A modern web browser that supports WebRTC (e.g., Chrome, Firefox).
*   A webcam and microphone.

## Setup and Running

1.  **Clone the repository (if applicable) or ensure all files (`index.html`, `server.py`, `style.css`) are in the same directory.**

2.  **Install Python dependencies:**
    Open a terminal or command prompt in the project directory and run:
    ```bash
    pip install aiohttp aiortc
    ```
    If you encounter issues with `aiortc` installation, you might need to install additional system dependencies for `libopus` or `libvpx`. Consult the `aiortc` documentation for platform-specific requirements. For example, on Debian/Ubuntu:
    ```bash
    sudo apt-get update
    sudo apt-get install libopus-dev libvpx-dev
    ```

3.  **Run the server:**
    ```bash
    python server.py
    ```
    By default, the server will start on `http://localhost:8080`. You can specify a different port using the `--port` argument (e.g., `python server.py --port 8000`).

4.  **Test the application:**
    *   Open your web browser and navigate to `http://localhost:8080` (or the port you configured).
    *   Click the "Start" button to access your camera and microphone. You may need to grant permission to the browser.
    *   Open a second browser tab or window and navigate to the same URL (`http://localhost:8080`).
    *   Click "Start" on the second page as well.
    *   On one of the pages, click the "Call" button. This page will act as the caller.
    *   The other page (callee) should automatically receive the call and establish the connection.
    *   You should see your local video on both pages and the remote video from the other page.
    *   Click "Hang Up" on either page to end the call.

## How it Works

1.  **Signaling:**
    *   When a user clicks "Call", their browser creates an SDP (Session Description Protocol) "offer".
    *   This offer is sent to the Python server via a WebSocket connection.
    *   The server forwards this offer to the other connected client (the callee).
    *   The callee's browser receives the offer, creates an SDP "answer", and sends it back to the server via WebSocket.
    *   The server forwards the answer to the original caller.

2.  **ICE Candidates:**
    *   During the offer/answer exchange, both clients also gather ICE (Interactive Connectivity Establishment) candidates. These candidates represent potential network paths for the media streams.
    *   ICE candidates are also exchanged via the WebSocket server.

3.  **Peer Connection:**
    *   Once the offer/answer exchange is complete and ICE candidates are successfully exchanged, a direct peer-to-peer connection is established between the two browsers (if network conditions allow).
    *   Video and audio streams are then transmitted directly, not through the server (though a TURN server would be needed for more complex network scenarios, which is not implemented in this basic demo).

## Limitations

*   **No TURN Server:** This demo does not include a TURN server, so it may not work if both peers are behind restrictive NATs/firewalls.
*   **Simple Signaling:** The signaling is very basic and only supports two participants. For multiple users or rooms, a more sophisticated signaling mechanism would be required.
*   **Error Handling:** Error handling is minimal.
*   **Security:** The server runs over HTTP by default. For production, HTTPS is essential. The `server.py` includes arguments for `--cert-file` and `--key-file` if you want to run it with HTTPS. Remember that `getUserMedia()` often requires a secure context (HTTPS or localhost).

## Further Development Ideas

*   Implement a TURN server for better connectivity.
*   Add support for multiple participants or chat rooms.
*   Implement text chat using WebRTC data channels.
*   Improve UI/UX.
*   Add screen sharing functionality.
*   Enhance security (e.g., user authentication).
