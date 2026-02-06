# Network Configuration Guide

## Setting up Network Access

To make your Story Weaver app accessible from other devices on your network:

### 1. Start Both Services
```bash
npm run start
```
This starts both the backend server (on 0.0.0.0:5000) and the Expo client (with Metro bundler).

Alternatively, start them separately:
```bash
# Terminal 1
npm run server:dev

# Terminal 2
npm run expo:dev
```

### 2. Find Your Computer's IP Address
On Windows:
```cmd
ipconfig
```

On Mac/Linux:
```bash
ifconfig
```
Look for your WiFi adapter's IPv4 address (typically something like 192.168.1.xxx).

### 3. Configure Environment Variables (Optional)
If you need to specify your computer's IP for the client to connect to the server, you can create a `.env.local` file:

Copy the example file:
```bash
copy .env.example .env.local  # On Windows
# OR
cp .env.example .env.local   # On Mac/Linux
```

Then edit `.env.local` and set your computer's IP address:
```
EXPO_DEV_SERVER_IP=192.168.1.xxx  # Replace with your actual IP
```

Note: This step is optional. The client will try to determine the server location automatically.

### 4. Access from Other Devices
- On other devices connected to the same network, scan the QR code shown in the terminal
- Or manually enter the IP address shown in the terminal

## Troubleshooting

### Firewall Issues
Make sure your firewall allows connections on ports 8081 (Metro bundler) and 5000 (API server).

### Connection Issues
- Verify all devices are on the same network
- Check that your computer's IP hasn't changed
- Ensure the ports are not blocked by firewall/security software

### Android Emulator
For Android emulator, the default configuration uses `10.0.2.2` to access the host machine.

### iOS Simulator
iOS simulator typically can access localhost directly, but for physical devices you'll need the IP approach.