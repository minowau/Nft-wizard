

import assert from "assert";

import { Account, RestClient, TESTNET_URL, FAUCET_URL, FaucetClient } from "./first_transaction";
import fetch from "cross-fetch";

export class TokenClient {
    restClient: RestClient;

    constructor(restClient: RestClient) {
        this.restClient = restClient;
    }

    async submitTransactionHelper(account: Account, payload: Record<string, any>) {
        const txn_request = await this.restClient.generateTransaction(account.address(), payload)
        const signed_txn = await this.restClient.signTransaction(account, txn_request)
        const res = await this.restClient.submitTransaction(signed_txn)
        await this.restClient.waitForTransaction(res["hash"])
    }

8
    async createCollection(account: Account, name: string, description: string, uri: string) {
        const payload: { function: string; arguments: string[]; type: string; type_arguments: any[] } = {
            type: "script_function_payload",
            function: "0x1::Token::create_unlimited_collection_script",
            type_arguments: [],
            arguments: [
                Buffer.from(name).toString("hex"),
                Buffer.from(description).toString("hex"),
                Buffer.from(uri).toString("hex"),
            ]
        };
        await this.submitTransactionHelper(account, payload);
    }

    async createToken(
        account: Account,
        collection_name: string,
        name: string,
        description: string,
        supply: number,
        uri: string) {
        const payload: { function: string; arguments: any[]; type: string; type_arguments: any[] } = {
            type: "script_function_payload",
            function: "0x1::Token::create_unlimited_token_script",
            type_arguments: [],
            arguments: [
                Buffer.from(collection_name).toString("hex"),
                Buffer.from(name).toString("hex"),
                Buffer.from(description).toString("hex"),
                true,
                supply.toString(),
                Buffer.from(uri).toString("hex")
            ]
        }
        await this.submitTransactionHelper(account, payload);
    }
    async offerToken(
        account: Account,
        receiver: string,
        creator: string,
        collection_name: string,
        token_name: string,
        amount: number) {
        const payload: { function: string; arguments: string[]; type: string; type_arguments: any[] } = {
            type: "script_function_payload",
            function: "0x1::TokenTransfers::offer_script",
            type_arguments: [],
            arguments: [
                receiver,
                creator,
                Buffer.from(collection_name).toString("hex"),
                Buffer.from(token_name).toString("hex"),
                amount.toString()
            ]
        }
        await this.submitTransactionHelper(account, payload);
    }

    async claimToken(
        account: Account,
        sender: string,
        creator: string,
        collection_name: string,
        token_name: string) {
        const payload: { function: string; arguments: string[]; type: string; type_arguments: any[] } = {
            type: "script_function_payload",
            function: "0x1::TokenTransfers::claim_script",
            type_arguments: [],
            arguments: [
                sender,
                creator,
                Buffer.from(collection_name).toString("hex"),
                Buffer.from(token_name).toString("hex"),
            ]
        }
        await this.submitTransactionHelper(account, payload);
    }
    async cancelTokenOffer(
        account: Account,
        receiver: string,
        creator: string,
        token_creation_num: number) {
        const payload: { function: string; arguments: string[]; type: string; type_arguments: any[] } = {
            type: "script_function_payload",
            function: "0x1::TokenTransfers::cancel_offer_script",
            type_arguments: [],
            arguments: [
                receiver,
                creator,
                token_creation_num.toString()
            ]
        }
        await this.submitTransactionHelper(account, payload);
    }

    async tableItem(handle: string, keyType: string, valueType: string, key: any): Promise<any> {
        const response = await fetch(`${this.restClient.url}/tables/${handle}/item`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                "key_type": keyType,
                "value_type": valueType,
                "key": key
            })
        });

        if (response.status == 404) {
            return null
        } else if (response.status != 200) {
            assert(response.status == 200, await response.text());
        } else {
            return await response.json();
        }
    }

    async getTokenBalance(owner: string, creator: string, collection_name: string, token_name: string): Promise<number> {
        const token_store = await this.restClient.accountResource(owner, "0x1::Token::TokenStore");
        const token_id = {
            creator: creator,
            collection: collection_name,
            name: token_name,
        };
        
        if (token_store == null) {
            return -1;
        }

        const token = await this.tableItem(
            token_store["data"]["tokens"]["handle"],
            "0x1::Token::TokenId",
            "0x1::Token::Token",
            token_id,
        );
        return token["value"];
    }

    async getTokenData(creator: string, collection_name: string, token_name: string): Promise<any> {
        const collections = await this.restClient.accountResource(creator, "0x1::Token::Collections");

        const token_id = {
            creator: creator,
            collection: collection_name,
            name: token_name,
        };

        return await this.tableItem(
            collections["data"]["token_data"]["handle"],
            "0x1::Token::TokenId",
            "0x1::Token::TokenData",
            token_id,
        );
    }

  }


async function main() {
    const restClient = new RestClient(TESTNET_URL);
    const client = new TokenClient(restClient);
    const faucet_client = new FaucetClient(FAUCET_URL, restClient);


    const meena = new Account();
    const prabhas = new Account();
    const collection_name = "meena's";
    const token_name = "meena's first token";

    console.log("\n=== Addresses ===");
    console.log(`meena: ${meena.address()}. Key Seed: ${Buffer.from(meena.signingKey.secretKey).toString("hex").slice(0, 64)}`);
    console.log(`prabhas: ${prabhas.address()}. Key Seed: ${Buffer.from(prabhas.signingKey.secretKey).toString("hex").slice(0, 64)}`);

    await faucet_client.fundAccount(meena.address(), 10_000_000);
    await faucet_client.fundAccount(prabhas.address(), 10_000_000);

    console.log("\n=== Initial Balances ===");
    console.log(`meena: ${await restClient.accountBalance(meena.address())}`);
    console.log(`prabhas: ${await restClient.accountBalance(prabhas.address())}`);

    console.log("\n=== Creating Collection and Token ===");

    await client.createCollection(meena, collection_name, "meena's simple collection", "https://aptos.dev");
    await client.createToken(meena, collection_name, token_name, "meena's simple token",  1, "https://aptos.dev/img/nyan.jpeg");

    let token_balance = await client.getTokenBalance(meena.address(), meena.address(), collection_name, token_name);
    console.log(`meena's token balance: ${token_balance}`)
    const token_data = await client.getTokenData(meena.address(), collection_name, token_name);
    console.log(`meena's token data: ${JSON.stringify(token_data)}`)

    console.log("\n=== Transferring the token to prabhas ===")
    await client.offerToken(meena, prabhas.address(), meena.address(), collection_name, token_name, 1);
    await client.claimToken(prabhas, meena.address(), meena.address(), collection_name, token_name);

    token_balance = await client.getTokenBalance(meena.address(), meena.address(), collection_name, token_name);
    console.log(`meena's token balance: ${token_balance}`)
    token_balance = await client.getTokenBalance(prabhas.address(), meena.address(), collection_name, token_name);
    console.log(`prabhas's token balance: ${token_balance}`)
}

if (require.main === module) {
    main().then((resp) => console.log(resp));
}
