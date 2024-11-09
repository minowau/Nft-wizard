

# 🎉 Welcome to the NFT Marketplace Project! 🎉

Developed with care by **Team Meenarashi** 💖.

---

## 🏠 Overview
Welcome to our NFT Marketplace! This project provides a platform to facilitate:
- ✅ Fixed-price NFT sales.
- 🚀 Auction-based NFT trading.
- 💰 Secure claiming of NFTs and proceeds.

Explore how to list, buy, bid, and claim NFTs seamlessly!

---

## ✨ Features
- 🔹 **Fixed-Price Sales**:
  - `listToken`: List an NFT for sale at a fixed price.
  - `buyToken`: Purchase an NFT at the listed price.
- 🔹 **Auction Functionality**:
  - `initAuction`: Start an auction for your NFT.
  - `bid`: Place a bid on an auctioned NFT.
  - `claimToken`: Claim the NFT after winning an auction.
  - `claimCoins`: Collect payment after a successful auction as the seller.

---



## 🚀 Usage

### 💎 `listToken`
_List your NFT for a fixed price sale._
```typescript
function listToken(uint256 tokenId, uint256 price) public;
```

### 🛒 `buyToken`
_Buy the NFT listed for a fixed price._
```typescript
function buyToken(uint256 tokenId) public payable;
```

### 🏁 `initAuction`
_Start an auction for your NFT._
```typescript
function initAuction(uint256 tokenId, uint256 startingPrice, uint256 duration) public;
```

### 🤑 `bid`
_Place a bid on an auctioned NFT._
```typescript
function bid(uint256 tokenId) public payable;
```

### 🏆 `claimToken`
_Claim your NFT after winning an auction._
```typescript
function claimToken(uint256 tokenId) public;
```

### 💵 `claimCoins`
_Collect payment after the auction ends._
```typescript
function claimCoins(uint256 tokenId) public;
```

---

## 🏃 Running the Project

To execute the TypeScript client scripts for the NFT Marketplace, use the following commands:

### 🚀 Run the Auction Client
```bash
npx ts-code auction_client.ts
```
This command will execute the `auction_client.ts` script, which handles the process of initializing auctions, placing bids, and claiming tokens.

### 🛒 Run the Fixed-Price Client
```bash
npx ts-code fixed_price_client.ts
```
This command will run the `fixed_price_client.ts` script to manage the fixed-price sale of NFTs, including listing and buying tokens.

---



## 🤝 Contributing

Contributions are welcome! Here's how to get involved:
1. Fork this repository.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m 'Add your feature'`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

---



---

## ✨ Special Thanks to **Team Meenarashi** ✨
```
     ★ ★ ★  ★ ★ ★  ★ ★ ★
    ★      M E E N A R A S H I      ★
     ★ ★ ★  ★ ★ ★  ★ ★ ★
```
Bringing creativity and innovation to the NFT space! 💫

---

## 📬 Contact

For questions or more information, reach out to **Team Meenarashi**:
- **Email**: jupalli.jaswant@iiitb.ac.in
- **GitHub**: [minowau](https://github.com/minowau)

---

**Thank you for exploring our NFT Marketplace!** 🥳

---