import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ADDRESS_ONE } from "../helpers/utils";

// Our deployed ACM address on bsctestnet
const OUR_ACM_ADDRESS = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {
    network: { live },
    getNamedAccounts,
    deployments,
  } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const vBNBAddress = (await ethers.getContractOrNull("vBNB"))?.address || ADDRESS_ONE;

  // Support BSC and other networks
  let comptrollerAddress = ADDRESS_ONE;
  try {
    comptrollerAddress = (await ethers.getContract("Unitroller"))?.address;
  } catch (e) {
    console.log("Unitroller not found, using AddressOne");
  }

  const WBNBAddress = (await ethers.getContractOrNull("WBNB"))?.address || ADDRESS_ONE;

  // For our fork: use deployer as owner instead of timelock
  const ownerAddress = deployer;

  // Use our deployed ACM, or fallback to deployed one
  let acmAddress: string;
  try {
    acmAddress = (await ethers.getContract("AccessControlManager")).address;
  } catch (e) {
    console.log("AccessControlManager not found in deployments, using hardcoded address");
    acmAddress = OUR_ACM_ADDRESS;
  }

  const loopsLimit = 20;

  const defaultProxyAdmin = await hre.artifacts.readArtifact(
    "hardhat-deploy/solc_0.8/openzeppelin/proxy/transparent/ProxyAdmin.sol:ProxyAdmin",
  );

  await deploy("ProtocolShareReserve", {
    from: deployer,
    log: true,
    deterministicDeployment: false,
    args: [comptrollerAddress, WBNBAddress, vBNBAddress],
    proxy: live
      ? {
          owner: ownerAddress,
          proxyContract: "OpenZeppelinTransparentProxy",
          execute: {
            methodName: "initialize",
            args: [acmAddress, loopsLimit],
          },
          viaAdminContract: {
            name: "DefaultProxyAdmin",
            artifact: defaultProxyAdmin,
          },
        }
      : {
          owner: deployer,
          proxyContract: "OpenZeppelinTransparentProxy",
          execute: {
            methodName: "initialize",
            args: [acmAddress, loopsLimit],
          },
        },
  });

  // Skip ownership transfer since we use deployer as owner
  console.log("ProtocolShareReserve deployed with deployer as owner");
};

func.tags = ["ProtocolShareReserve"];

export default func;
