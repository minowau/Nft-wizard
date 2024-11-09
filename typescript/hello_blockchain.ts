
import assert from "assert";
import fs from "fs";
import { Account, RestClient, TESTNET_URL, FAUCET_URL, FaucetClient } from "./first_transaction";

const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
});

class HelloBlockchainClient extends RestClient {

  /** Publish a new module to the blockchain within the specified account */
  async publishModule(accountFrom: Account, moduleHex: string): Promise<string> {
    const payload = {
      "type": "module_bundle_payload",
      "modules": [
        {"bytecode": `0x${moduleHex}`},
      ],
    };
    const txnRequest = await this.generateTransaction(accountFrom.address(), payload);
    const signedTxn = await this.signTransaction(accountFrom, txnRequest);
    const res = await this.submitTransaction(signedTxn);
    return res["hash"];
  }
 
  async getMessage(contractAddress: string, accountAddress: string): Promise<string> {
    const resource = await this.accountResource(accountAddress, `0x${contractAddress}::Message::MessageHolder`);
    if (resource == null) {
      return null;
    } else {
      return resource["data"]["message"]
    }
  }

  async setMessage(contractAddress: string, accountFrom: Account, message: string): Promise<string> {
    let payload: { function: string; arguments: string[]; type: string; type_arguments: any[] };
    payload = {
      "type": "script_function_payload",
      "function": `0x${contractAddress}::Message::set_message`,
      "type_arguments": [],
      "arguments": [
        Buffer.from(message, "utf-8").toString("hex")
      ]
    };

    const txnRequest = await this.generateTransaction(accountFrom.address(), payload);
    const signedTxn = await this.signTransaction(accountFrom, txnRequest);
    const res = await this.submitTransaction(signedTxn);
    return res["hash"];
  }

}

async function main() {
  assert(process.argv.length == 3, "Expecting an argument that points to the hellochain module");

  const restClient = new HelloBlockchainClient(TESTNET_URL);
  const faucetClient = new FaucetClient(FAUCET_URL, restClient);

  
  const meena = new Account();
  const prabhas = new Account();

  console.log("\n=== Addresses ===");
  console.log(`meena: ${meena.address()}`);
  console.log(`prabhas: ${prabhas.address()}`);

  await faucetClient.fundAccount(meena.address(), 10_000_000);
  await faucetClient.fundAccount(prabhas.address(), 10_000_000);

  console.log("\n=== Initial Balances ===");
  console.log(`meena: ${await restClient.accountBalance(meena.address())}`);
  console.log(`prabhas: ${await restClient.accountBalance(prabhas.address())}`);

  await new Promise<void>(resolve => {
    readline.question("Update the module with meena's address, build, copy to the provided path, and press enter.", () => {
      resolve();
      readline.close();
    });
  });
  const modulePath = process.argv[2];
  const moduleHex = fs.readFileSync(modulePath).toString("hex");

  console.log("\n=== Testing meena ===");
  console.log("Publishing...");

  let txHash = await restClient.publishModule(meena, moduleHex);
  console.log(await restClient.waitForTransaction(txHash));
  
}

if (require.main === module) {
  main().then((resp) => console.log(resp));
}