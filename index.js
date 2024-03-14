import Web3 from 'web3';
import fs from 'fs'
import { log } from 'console';
// Read the config.json file
const configFile = fs.readFileSync('config.json', 'utf8');
// const faucet=
const configData = JSON.parse(configFile);
async function generateAddresses(count = 0) {
  if (count === 0) {
    return;
  }
  const web3 = new Web3("https://rpc.flashbots.net");
  const addresses = [];

  for (let i = 0; i < count; i++) {
    const account = web3.eth.accounts.create();
    addresses.push(account.address + "---" + account.privateKey);
  }
  const dataDir = './data';
  fs.writeFileSync(`${dataDir}/address.txt`, addresses.join('\n'));
  return addresses;
}
// await generateAddresses();


//归集水龙头地址的BNB到主地址
async function transferTokens() {
  const bsc_test = new Web3("https://data-seed-prebsc-1-s2.bnbchain.org:8545");
  const faucet = configData.faucet;
  const maininfo = configData.mainaddress;
  log('Transfer started');
  log('Faucet address:', faucet.length);
  for (let i = 0; i < faucet.length; i++) {
    const account = bsc_test.eth.accounts.privateKeyToAccount("0x" + faucet[i]);
    const nonce = await bsc_test.eth.getTransactionCount(account.address);
    const gasPrice = await bsc_test.eth.getGasPrice();
    const balance = await bsc_test.eth.getBalance(account.address);
    const gasLimit = 21000;  // gas limit for standard transaction
    const gasCost = BigInt(gasPrice) * BigInt(gasLimit);
    const amountToSend = BigInt(balance) - gasCost;
    if (amountToSend <= 0n) {
      log('Not enough balance to cover gas costs.');
      continue;
    }
    const tx = {
      to: maininfo.address.toLowerCase(),
      nonce: nonce,
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      value: amountToSend.toString()
    };
    log(tx);
    log("签名开始");
    const signedTx = await bsc_test.eth.accounts.signTransaction(tx, account.privateKey);
    log("签名结束");
    const receipt = await bsc_test.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(receipt);
  }
  log('Transfer complete');
}
// await transferTokens();

//分发bnb到其他地址
async function distributeTokens(addresses = []) {
  if (addresses.length === 0) {
    return;
  }
  const bsc_test = new Web3("https://data-seed-prebsc-1-s2.bnbchain.org:8545");
  const maininfo = configData;
  const dataDir = './data';
  // const addressFile = fs.readFileSync(`${dataDir}/address.txt`, 'utf8');

  // const addresses = addressFile.split('\n');
  log(addresses.length);
  for (let i = 0; i < addresses.length; i++) {
    const account = bsc_test.eth.accounts.privateKeyToAccount(addresses[i].split("---")[1]);
    const nonce = await bsc_test.eth.getTransactionCount(maininfo.mainaddress.address);
    const gasPrice = await bsc_test.eth.getGasPrice();
    const gasLimit = 21000;  // gas limit for standard transaction

    const gasCost = BigInt(gasPrice) * BigInt(gasLimit);
    // log("gasCost:" + gasCost);
    // log("gasprice:" + gasPrice);
    // log("gasLimit:" + gasLimit);
    //计算好要发送的金额
    const amountToSend = BigInt(bsc_test.utils.toWei(0.002, "ether")) - gasCost;
    const tx = {
      to: account.address.toLowerCase(),
      nonce: nonce,
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      value: amountToSend.toString()
    };
    // log(tx);

    try {
      const signedTx = await bsc_test.eth.accounts.signTransaction(tx, maininfo.mainaddress.privatekey);
      const receipt = await bsc_test.eth.sendSignedTransaction(signedTx.rawTransaction);
      const xx = await bsc_test.eth.getBalance(account.address);
      // log(xx);
      log("交易哈希：" + receipt.blockHash);
      log(account.address + "接收到" + BigInt(xx) / BigInt(10 ** 18) + "BNB");

      // const dataDir = './data';
      // const filePath = `${dataDir}/getfaucetSucceed.txt`;
      // fs.appendFileSync(filePath, `${addresses[i]}\n`);

    }
    catch (e) {
      log(e);
    }
    log("------------------------");
  }
  console.log(addresses);

}
// await distributeTokens();
async function delayExecution(delay) {
  console.log('Delay starts');
  await new Promise(resolve => setTimeout(resolve, delay * 1000));
  console.log('Delay ends');
}

// This will pause the execution for 3 seconds
//获取erc20代币
async function getNLLK(addresses = [], selectedaddress) {
  if (addresses.length === 0) {
    return;
  }
  // 连接到以太坊节点
  const web3 = new Web3('https://data-seed-prebsc-1-s2.bnbchain.org:8545'); // 替换为你的以太坊节点URL

  // 你的智能合约地址和ABI
  const contractAddress = '0x3cC6FC1035465d5b238F04097dF272Fe9b60EB94'; // 替换为你的智能合约地址
  const contractABI = [
    // ...你的智能合约ABI
    {
      inputs: [
        {
          internalType: "address",
          name: "_user",
          type: "address"
        },
        {
          internalType: "string",
          name: "_countryCode",
          type: "string"
        },
        {
          internalType: "string",
          name: "_ip",
          type: "string"
        }
      ],
      name: "getTestNLLK",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];

  // 创建合约实例
  const contract = new web3.eth.Contract(contractABI, contractAddress);

  // 从文件中读取用户地址和私钥
  // const userAccounts = fs.readFileSync('./data/getfaucetSucceed.txt', 'utf-8').split('\n').map(line => {
  //   const [address, privateKey] = line.split('---');
  //   return { address, privateKey };
  // });

  const countryCode = '0'; // 替换为国家代码
  const userIP = '0'; // 替换为用户IP

  // 创建并签名交易
  for (const line of addresses) {
    const [address, privateKey] = line.split('---');
    const data = contract.methods.getTestNLLK(address, countryCode, userIP).encodeABI();
    // log(data);
    // log(address, privateKey);
    // 估计gas
    const gas = await web3.eth.estimateGas({
      from: web3.eth.accounts.privateKeyToAccount(privateKey).address,
      to: contractAddress,
      data
    });
    // 获取gas价格
    const gasPrice = await web3.eth.getGasPrice();
    const tx = {
      from: web3.eth.accounts.privateKeyToAccount(privateKey).address,
      to: contractAddress,
      gas,
      gasPrice,
      data
    };
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

    // 发送交易
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
      .on('transactionHash', (hash) => {
        console.log('Transaction Hash:', hash);
      })
      .on('confirmation', (confirmationNumber, receipt) => {
        // console.log('Confirmation Number:', confirmationNumber);
        // console.log('Receipt:', receipt);
      })
      .on('error', (error) => {
        console.error('Error:', error);
      });
    log("---------------------------------");
    log(address + "已获取NLK");
    // 添加随机延迟
    const delay = Math.floor(Math.random() * (120 - 60 + 1)) + 60; // 随机延迟60到120秒
    log(`延迟 ${delay} 秒进行归集`);
    delayExecution(delay * 1000); 
    // await new Promise(resolve => setTimeout(resolve,delay * 1000 ));
    await collectTokens(selectedaddress, '0x06A0F0fa38AE42b7B3C8698e987862AfA58e90D9', privateKey);
    log(address + "已归集NLK到" + selectedaddress);
    // 添加随机延迟--进行下一个地址的操作
    const delay1 = Math.floor(Math.random() * (820 - 360 + 1)) + 60; // 随机延迟60到120秒
    log(`延迟 ${delay1} 秒进行下一个地址的操作`);
    // await new Promise(resolve => setTimeout(resolve, delay1 * 1000));
    delayExecution(delay1 * 1000); 
  }
}

// await getNLLK().catch(console.error);

//归集erc20代币到主地址--集合版
// async function collectTokens(targetAddress, tokenAddress) {
//   const bsc_test = new Web3("https://data-seed-prebsc-1-s2.bnbchain.org:8545");
//   const dataDir = './data';
//   const addressFile = fs.readFileSync(`${dataDir}/getfaucetSucceed.txt`, 'utf8');
//   const contractABI = [
//     {
//       "constant": false,
//       "inputs": [
//         {
//           "name": "_to",
//           "type": "address"
//         },
//         {
//           "name": "_value",
//           "type": "uint256"
//         }
//       ],
//       "name": "transfer",
//       "outputs": [
//         {
//           "name": "",
//           "type": "bool"
//         }
//       ],
//       "payable": false,
//       "stateMutability": "nonpayable",
//       "type": "function"
//     }, {
//       "constant": true,
//       "inputs": [
//         {
//           "name": "_owner",
//           "type": "address"
//         }
//       ],
//       "name": "balanceOf",
//       "outputs": [
//         {
//           "name": "balance",
//           "type": "uint256"
//         }
//       ],
//       "payable": false,
//       "stateMutability": "view",
//       "type": "function"
//     }
//   ];
//   const addresses = addressFile.split('\n');
//   const tokenContract = new bsc_test.eth.Contract(contractABI, tokenAddress);

//   for (let i = 0; i < addresses.length; i++) {
//     const account = bsc_test.eth.accounts.privateKeyToAccount(addresses[i].split("---")[1]);
//     const balance = await tokenContract.methods.balanceOf(account.address).call();
//     log(balance);
//     if (balance > 0) {
//       const gasPrice = await bsc_test.eth.getGasPrice();
//       const gasLimit = 60000;  // gas limit for ERC20 transfer
//       const tx = {
//         to: tokenAddress,
//         nonce: await bsc_test.eth.getTransactionCount(account.address),
//         gasPrice: gasPrice,
//         gas: gasLimit,
//         data: tokenContract.methods.transfer(targetAddress, balance).encodeABI(),
//         from: account.address
//       };
//       const signedTx = await bsc_test.eth.accounts.signTransaction(tx, account.privateKey);
//       await bsc_test.eth.sendSignedTransaction(signedTx.rawTransaction);
//     }
//   }
// }
//归集erc20代币到主地址--单个版
async function collectTokens(targetAddress, tokenAddress, selectedprivatekey) {
  log(targetAddress, tokenAddress, selectedprivatekey);
  const bsc_test = new Web3("https://data-seed-prebsc-1-s2.bnbchain.org:8545");
  // const contractABI = [
  //   {
  //     "constant": false,
  //     "inputs": [
  //       {
  //         "name": "_to",
  //         "type": "address"
  //       },
  //       {
  //         "name": "_value",
  //         "type": "uint256"
  //       }
  //     ],
  //     "name": "transfer",
  //     "outputs": [
  //       {
  //         "name": "",
  //         "type": "bool"
  //       }
  //     ],
  //     "payable": false,
  //     "stateMutability": "nonpayable",
  //     "type": "function"
  //   }
  // ];
  const contractABI = [
    {
      "constant": false,
      "inputs": [
        {
          "name": "_to",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "_owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "name": "balance",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ];
  log("私钥============="+selectedprivatekey);
  const tokenContract = new bsc_test.eth.Contract(contractABI, tokenAddress);
  const account = bsc_test.eth.accounts.privateKeyToAccount(selectedprivatekey);
  log(account.address);
  const balance = await tokenContract.methods.balanceOf(account.address).call();
  // log(balance);
  if (balance > 0) {
    const gasPrice = await bsc_test.eth.getGasPrice();
    const gasLimit = 60000;  // gas limit for ERC20 transfer
    log("gasPrice:"+gasPrice);  
    const tx = {
      to: tokenAddress,
      nonce: await bsc_test.eth.getTransactionCount(account.address),
      gasPrice: gasPrice,
      gas: gasLimit,
      data: tokenContract.methods.transfer(targetAddress, balance).encodeABI(),
      from: account.address
    };
    // log(tx);
    const signedTx = await bsc_test.eth.accounts.signTransaction(tx, account.privateKey);
    // log(signedTx);
    await bsc_test.eth.sendSignedTransaction(signedTx.rawTransaction);
  }
}
// Call the function with your target address and token address
// await collectTokens('0xc081A9126BDf8A41Fb64b52eA89658f288d4b3c2', '0x06A0F0fa38AE42b7B3C8698e987862AfA58e90D9');
// const readline = require('readline');
import readline from 'readline';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}
async function main() {

  //获取归集地址
  let targetAddress = configData.targtaddress;
  log(targetAddress);

  let options = '为哪个地址取币:\n';
  for (let i = 0; i < targetAddress.length; i++) {
    options += `${i + 1}. ${targetAddress[i]}\n`;
  }
  let selectedaddress = '';
  const answer= await question(options);
  if (answer < 1 || answer > targetAddress.length) {
    console.log('输入错误');
    rl.close();
    return;
  }
  selectedaddress = targetAddress[answer - 1];
  console.log(`开始为地址${selectedaddress}取币`);
  rl.close();
  console.log('开始生成10个地址');
  let newaddress = await generateAddresses(1);
  console.log("已生成地址：\n" + newaddress);
  log('开始给生成的地址转gas');
  await distributeTokens(newaddress);
  log('转gas完成');
  log('开始获取NLLK');
  await getNLLK(newaddress, selectedaddress);
  log('获取NLLK完成');
  log("任务结束");
}

await main();