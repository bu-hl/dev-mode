const shim = require('fabric-shim');
const util = require('util');

const ABstore = class {
  async Init(stub) {
    console.info('========= NFTChaincode Init =========');
    return shim.success();
  }

  async Invoke(stub) {
    const ret = stub.getFunctionAndParameters();
    const method = this[ret.fcn];
    if (!method) {
      return shim.error(`No method named ${ret.fcn} found`);
    }

    try {
      const payload = await method.call(this, stub, ret.params);
      return shim.success(Buffer.from(payload));
    } catch (err) {
      return shim.error(err.message);
    }
  }

  // NFT 존재 확인
  async NFTExists(stub, args) {
    const tokenId = args[0];
    const data = await stub.getState(tokenId);
    return (!!data && data.length > 0).toString();
  }

  // NFT 발행
  async MintNFT(stub, args) {
    const tokenId = args[0];
    const owner = args[1];
    const metadata = args[2];

    const exists = await stub.getState(tokenId);
    if (exists && exists.length > 0) {
      throw new Error(`NFT ${tokenId} already exists`);
    }

    const nft = {
      tokenId,
      owner,
      metadata
    };

    await stub.putState(tokenId, Buffer.from(JSON.stringify(nft)));
    return `✅ NFT ${tokenId} minted`;
  }

  // NFT 조회
  async ReadNFT(stub, args) {
    const tokenId = args[0];
    const data = await stub.getState(tokenId);
    if (!data || data.length === 0) {
      throw new Error(`NFT ${tokenId} does not exist`);
    }
    return data.toString();
  }

  // 소유자 변경
  async TransferNFT(stub, args) {
    const tokenId = args[0];
    const newOwner = args[1];

    const data = await stub.getState(tokenId);
    if (!data || data.length === 0) {
      throw new Error(`NFT ${tokenId} does not exist`);
    }

    const nft = JSON.parse(data.toString());
    nft.owner = newOwner;

    await stub.putState(tokenId, Buffer.from(JSON.stringify(nft)));
    return `🔄 NFT ${tokenId} transferred to ${newOwner}`;
  }
};

shim.start(new ABstore());
