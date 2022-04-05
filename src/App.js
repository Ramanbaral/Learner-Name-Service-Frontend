import React, { useEffect, useState } from 'react';
import {ethers} from "ethers";

import domains from "./utils/domains.json";
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks.js';

// Constants
const TWITTER_HANDLE = 'raman_baral_';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const tld = ".learner";
const CONTRACT_ADDRESS = "0x8405653C638acd1DBED603FC39d2EAdCB75d208B";

const App = () => {

	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');
	const [network, setNetwork] = useState('');
	const [editing, setEditing] = useState(false);
	const [loading, setLoading] = useState(false);
	const [mints, setMints] = useState([]);

	const connectWallet = async () => {
		try {
			const {ethereum} = window;

			if(!ethereum) {
				alert("Get MetaMask -> https://metamask.io/");
				return;
			}

			const accounts = await ethereum.request({method: "eth_requestAccounts"});
			setCurrentAccount(accounts[0]);
		}
		catch(err) {
			console.log(err);
		}
	}

	const mintDomain = async () => {
		if (!domain) return;

		// Calculate price based on length of domain (change this to match your contract)	
		// <3 chars = 0.5 MATIC, <6 chars = 0.2 MATIC, 7 or more = 0.1 MATIC
		const price = domain.length <= 3 ? '0.5' : domain.length <= 6 ? '0.2' : '0.1';
		console.log("Minting domain", domain, "with price", price);

	  try {
		const { ethereum } = window;

		if (ethereum) {
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, domains.abi, signer);

			let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
			const receipt = await tx.wait();

			if (receipt.status === 1) {
				console.log("Domain minted! https://mumbai.polygonscan.com/tx/"+tx.hash);
				
				tx = await contract.setRecord(domain, record);
				await tx.wait();
				
				console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);
				
				setTimeout(async () => {
					await fetchMints();
					let tokenId = mints.at(-1).id;
					alert(`Domain minted! https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${tokenId+1}`);
				}, 1000);
				
				setRecord('');
				setDomain('');
			}
			else {
				alert("Transaction failed! Please try again");
			}
		}
	  }
	  catch(err){
		console.log(err);
	  }
	}

	const fetchMints = async () => {
		try {
		  const { ethereum } = window;
		  if (ethereum) {
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, domains.abi, signer);
			  
			const names = await contract.getAllNames();
			  
			const mintRecords = await Promise.all(names.map(async (name) => {
				const mintRecord = await contract.getRecord(name);
				const owner = await contract.getAddress(name);
				return {
				id: names.indexOf(name),
				name: name,
				record: mintRecord,
				owner: owner,
				};
		  }));
	  
		  console.log("MINTS FETCHED ", mintRecords);
		  setMints(mintRecords);
		  }
		} catch(error){
		  console.log(error);
		}
	  }

	const updateDomain = async () => {
		if (!record || !domain) { return }
		setLoading(true);
		console.log("Updating domain", domain, "with record", record);
		  try {
		  const { ethereum } = window;
		  if (ethereum) {
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, domains.abi, signer);
	  
			let tx = await contract.setRecord(domain, record);
			await tx.wait();
			console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);
	  
			fetchMints();
			setRecord('');
			setDomain('');
		  }
		  } catch(error) {
			console.log(error);
		  }
		setLoading(false);
	}

	const checkIfWalletIsConnected = async () => {
		const {ethereum} = window;

		if(!ethereum) {
			window.alert("Get Metamask");
			return;
		}

		const accounts = await ethereum.request({method: "eth_accounts"});

		if(accounts.length !== 0) {
			const account = accounts[0];
			setCurrentAccount(account);
		}
		else {
			console.log("No authorized accounts found.")
		}

		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);

		ethereum.on('chainChanged', handleChainChanged);
		
		// Reload the page when they change networks
		function handleChainChanged(_chainId) {
			window.location.reload();
		}
	}

	const switchNetwork = async () => {
		if (window.ethereum) {
		  try {
			// Try to switch to the Mumbai testnet
			await window.ethereum.request({
			  method: 'wallet_switchEthereumChain',
			  params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
			});
		  } catch (error) {
			// This error code means that the chain we want has not been added to MetaMask
			// In this case we ask the user to add it to their MetaMask
			if (error.code === 4902) {
			  try {
				await window.ethereum.request({
				  method: 'wallet_addEthereumChain',
				  params: [
					{	
					  chainId: '0x13881',
					  chainName: 'Polygon Mumbai Testnet',
					  rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
					  nativeCurrency: {
						  name: "Mumbai Matic",
						  symbol: "MATIC",
						  decimals: 18
					  },
					  blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
					},
				  ],
				});
			  } catch (error) {
				console.log(error);
			  }
			}
			console.log(error);
		  }
		} else {
		  // If window.ethereum is not found then MetaMask is not installed
		  alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		} 
	}

	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
		  <img src="https://media.giphy.com/media/8dYmJ6Buo3lYY/giphy.gif" alt="Learning gif" />
		  <button className="cta-button connect-wallet-button" onClick={connectWallet}>
			Connect Wallet
		  </button>
		</div>
	);

	const renderInputForm = () =>{
		if (network !== 'Polygon Mumbai Testnet') {
		  return (
			<div className="connect-wallet-container">
			  <p>Please connect to Polygon Mumbai Testnet</p>
			  <button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
			</div>
		  );
		}
	
		return (
		  <div className="form-container">
			<div className="first-row">
			  <input
				type="text"
				value={domain}
				placeholder='domain'
				onChange={e => setDomain(e.target.value)}
			  />
			  <p className='tld'> {tld} </p>
			</div>
	
			<input
			  type="text"
			  value={record}
			  placeholder='what you love learning?'
			  onChange={e => setRecord(e.target.value)}
			/>
			  {/* If the editing variable is true, return the "Set record" and "Cancel" button */}
			  {editing ? (
				<div className="button-container">
				  <button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
					Set record
				  </button>  

				  <button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
					Cancel
				  </button>  
				</div>
			  ) : (
				// If editing is not true, the mint button will be returned instead
				<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
				  Mint
				</button>  
			  )}
		  </div>
		);
	}

	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
		  return (
			<div className="mint-container">
			  <p className="subtitle"> Recently minted domains!</p>
			  <div className="mint-list">
				{ mints.map((mint, index) => {
				  return (
					<div className="mint-item" key={index}>
					  <div className='mint-row'>
						<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
						  <p className="underlined">{' '}{mint.name}{tld}{' '}</p>
						</a>
						{/* If mint.owner is currentAccount, add an "edit" button*/}
						{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
						  <button className="edit-button" onClick={() => editRecord(mint.name)}>
							<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
						  </button>
						  :
						  null
						}
					  </div>
				<p> {mint.record} </p>
			  </div>)
			  })}
			</div>
		  </div>);
		}
	}

	const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setDomain(name);
	}

	useEffect(() => {
		if (network === 'Polygon Mumbai Testnet') {
			fetchMints();
		}
		checkIfWalletIsConnected();
	}, [currentAccount, network])



  return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
						<div className="left">
						<p className="title">📖 Learner Name Service</p>
						<p className="subtitle">Get you LNS today and become a lifelong learner.</p>
						</div>
						{/* Display a logo and wallet connection status*/}
						<div className="right">
						<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
						{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>
				</div>

				{!currentAccount && renderNotConnectedContainer()}

				{currentAccount && renderInputForm()}

				{mints && renderMints()}

        		<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built by @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
