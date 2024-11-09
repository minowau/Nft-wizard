

import * as SHA3 from "js-sha3";
import fetch from "cross-fetch";
import * as Nacl from "tweetnacl";
import assert from "assert";


export const TESTNET_URL = "https://fullnode.devnet.aptoslabs.com";
export const FAUCET_URL = "https://faucet.devnet.aptoslabs.com";


export type TxnRequest = Record<string, any> & { sequence_number: string };

export class Account {
  signingKey: Nacl.SignKeyPair;

  constructor(seed?: Uint8Array | undefined) {
    if (seed) {
      this.signingKey = Nacl.sign.keyPair.fromSeed(seed);
    } else {
      this.signingKey = Nacl.sign.keyPair();
    }
  }
 
  address(): string {
    return this.authKey();
  }

  /** Returning the authKey  */
  authKey(): string {
    let hash = SHA3.sha3_256.create();
    hash.update(Buffer.from(this.signingKey.publicKey));
    hash.update("\x00");
    return hash.hex();
  }

  /** Returning the public key*/
  pubKey(): string {
    return Buffer.from(this.signingKey.publicKey).toString("hex");
  }
}


export class RestClient {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  async account(accountAddress: string): Promise<Record<string, string> & { sequence_number: string }> {
    const response = await fetch(`${this.url}/accounts/${accountAddress}`, {method: "GET"});
    if (response.status != 200) {
      assert(response.status == 200, await response.text());
    }
    return await response.json();
  }

  /** Returns all resources associated with the account */
  async accountResource(accountAddress: string, resourceType: string): Promise<any> {
    const response = await fetch(`${this.url}/accounts/${accountAddress}/resource/${resourceType}`, {method: "GET"});
    if (response.status == 404) {
        return null
    }
    if (response.status != 200) {
      assert(response.status == 200, await response.text());
    }
    return await response.json();
  }

 
  async generateTransaction(sender: string, payload: Record<string, any>): Promise<TxnRequest> {
    const account = await this.account(sender);
    const seqNum = parseInt(account["sequence_number"]);
    return {
      "sender": `0x${sender}`,
      "sequence_number": seqNum.toString(),
      "max_gas_amount": "2000",
      "gas_unit_price": "1",
      // Unix timestamp, in seconds + 10 minutes
      "expiration_timestamp_secs": (Math.floor(Date.now() / 1000) + 600).toString(),
      "payload": payload,
    };
  }

  async signTransaction(accountFrom: Account, txnRequest: TxnRequest): Promise<TxnRequest> {
    const response = await fetch(`${this.url}/transactions/signing_message`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(txnRequest)
    });
    if (response.status != 200) {
      assert(response.status == 200, (await response.text()) + " - " + JSON.stringify(txnRequest));
    }
    const result: Record<string, any> & { message: string } = await response.json();
    const toSign = Buffer.from(result["message"].substring(2), "hex");
    const signature = Nacl.sign(toSign, accountFrom.signingKey.secretKey);
    const signatureHex = Buffer.from(signature).toString("hex").slice(0, 128);
    txnRequest["signature"] = {
      "type": "ed25519_signature",
      "public_key": `0x${accountFrom.pubKey()}`,
      "signature": `0x${signatureHex}`,
    };
    return txnRequest;
  }

  async submitTransaction(txnRequest: TxnRequest): Promise<Record<string, any>> {
    const response = await fetch(`${this.url}/transactions`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(txnRequest)
    });
    if (response.status != 202) {
      assert(response.status == 202, (await response.text()) + " - " + JSON.stringify(txnRequest));
    }
    return await response.json();
  }

  async transactionPending(txnHash: string): Promise<boolean> {
    const response = await fetch(`${this.url}/transactions/${txnHash}`, {method: "GET"});
    if (response.status == 404) {
      return true;
    }
    if (response.status != 200) {
      assert(response.status == 200, await response.text());
    }
    return (await response.json())["type"] == "pending_transaction";
  }

  async waitForTransaction(txnHash: string) {
    let count = 0;
    while (await this.transactionPending(txnHash)) {
      assert(count < 10);
      await new Promise(resolve => setTimeout(resolve, 1000));
      count += 1;
      if (count >= 10) {
        throw new Error(`Waiting for transaction ${txnHash} timed out!`);
      }
    }
  }

  
  async accountBalance(accountAddress: string): Promise<number | null> {
    const resource = await this.accountResource(accountAddress, "0x1::TestCoin::Balance");
    if (resource == null) {
        return null
    }
    return parseInt(resource["data"]["coin"]["value"]);
  }


  async transfer(accountFrom: Account, recipient: string, amount: number): Promise<string> {
    const payload: { function: string; arguments: string[]; type: string; type_arguments: any[] } = {
      type: "script_function_payload",
      function: "0x1::TestCoin::transfer",
      type_arguments: [],
      arguments: [
        `0x${recipient}`,
        amount.toString(),
      ]
    };
    const txnRequest = await this.generateTransaction(accountFrom.address(), payload);
    const signedTxn = await this.signTransaction(accountFrom, txnRequest);
    const res = await this.submitTransaction(signedTxn);
    return res["hash"].toString();
  }

}


export class FaucetClient {
  url: string;
  restClient: RestClient;

  constructor(url: string, restClient: RestClient) {
    this.url = url;
    this.restClient = restClient;
  }


  async fundAccount(address: string, amount: number) {
    const url = `${this.url}/mint?amount=${amount}&address=${address}`;
    const response = await fetch(url, {method: "POST"});
    if (response.status != 200) {
      assert(response.status == 200, await response.text());
    }
    const tnxHashes = await response.json() as Array<string>;
    for (const tnxHash of tnxHashes) {
      await this.restClient.waitForTransaction(tnxHash);
    }
  }

}


async function main() {
  const restClient = new RestClient(TESTNET_URL);
  const faucetClient = new FaucetClient(FAUCET_URL, restClient);

  // Create two accounts, meena and prabhas, and fund meena but not prabhas
  const meena = new Account();
  const prabhas = new Account();

  console.log("\n=== Addresses ===");
  console.log(`meena: ${meena.address()}. Key Seed: ${Buffer.from(meena.signingKey.secretKey).toString("hex").slice(0, 64)}`);
  console.log(`prabhas: ${prabhas.address()}. Key Seed: ${Buffer.from(prabhas.signingKey.secretKey).toString("hex").slice(0, 64)}`);

  await faucetClient.fundAccount(meena.address(), 1_000_000_000);
  await faucetClient.fundAccount(prabhas.address(), 0);

  console.log("\n=== Initial Balances ===");
  console.log(`meena: ${await restClient.accountBalance(meena.address())}`);
  console.log(`prabhas: ${await restClient.accountBalance(prabhas.address())}`);

  // Have meena give prabhas 1000 coins
  const txHash = await restClient.transfer(meena, prabhas.address(), 1_000);
  await restClient.waitForTransaction(txHash);

  console.log("\n=== Final Balances ===");
  console.log(`meena: ${await restClient.accountBalance(meena.address())}`);
  console.log(`prabhas: ${await restClient.accountBalance(prabhas.address())}`);
}

if (require.main === module) {
  main().then((resp) => console.log(resp));
}

