import { useState, useEffect } from 'react';
import { NFTStorage, File } from 'nft.storage'
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';

// Components
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';

// ABIs
import NFT from './abis/NFT.json'

// Config
import config from './config.json';

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState(null)
  
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState(null)
  const [url, setURL] = useState(null)

  const [message, setMessage] = useState("") 
  const [isWaiting, setIsWaiting] = useState(false)

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    const network = await provider.getNetwork()

    const nft = new ethers.Contract(config[network.chainId].nft.address, NFT, provider)
    setNFT(nft)
  }

  const submitHandler = async (e) => {
   e.preventDefault() 

   if (name === "" || description === "") {
    window.alert("请提供名称和描述")
    return
   }

   setIsWaiting(true)

   const imageData = createImage()

//上传图片到IPFS
   const url = await uploadImage(imageData)

   await mintImage(url)

   setIsWaiting(false)
   setMessage("")
  }

   const createImage = async () => {
    setMessage("创建图片中...")

    const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`

    const response = await axios({
      url:URL,
      method:'POST',
      headers:{
        Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ 
        inputs: description, Options: { wait_for_model: true},
      }),
      responseType: 'arraybuffer',
    })

    const type = response.headers['content-type']
    const data = response.data

    const base64data = Buffer.from(data).toString('base64')
    const img = `data:${type};base64,` + base64data
    setImage(img)

    return data

   }

   const uploadImage = async (imageData) => {
    setMessage("上传图片中...")

    const nftstorage = new NFTStorage({ token: process.env.REACT_APP_NFT_STORAGE_API_KEY })

    const { ipnft } = await nftstorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: description,
    })

    //保存url
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`
    setURL(url)

    return url
   } 

   //铸币系统
   const mintImage = async (tokenURI) => {
    setMessage("钱包签名中...")

    const signer = await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI, { value: ethers.utils.parseUnits("1", "ether") })
    await transaction.wait()
   }

  useEffect(() => {
    loadBlockchainData()
  }, []) 

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />

      <div className="form">
        <form onSubmit={submitHandler}>
          <input type="text" placeholder="请输入名称..." onChange={(e) => {setName(e.target.value) }}></input>
          <input type="text" placeholder="请输入描述..." onChange={(e) => { setDescription(e.target.value) }}></input>
          <input type="submit" value="Create & Mint"></input>
        </form>

        <div className="image">
          {!isWaiting && image ?(
            <img src={image} alt="AI generated image" />
          ) : isWaiting ? (
            <div className="image__placeholder">
              <Spinner animation="border" />
              <p>{message}</p>
              </div>
          ) : (
            <></>
          )}
          </div>

          </div>

          {!isWaiting && url && (
            <p>
              View&nbsp;<a href={url} target="_blank" rel="noreferrer">Metadata</a>
            </p>
          )}
          </div>
  );
}

export default App;
