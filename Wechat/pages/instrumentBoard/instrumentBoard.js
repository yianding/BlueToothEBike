/**
 * @version: V1.1
 * @author: left-TTC@github
 * @description: Only one dashboard page
 * @data : 2024-11-23
 * @useLibrary :    ether / crypto / weapp-qrcode / jsqr
 **/

import ethers from '../../dist/ethers.js';
import CryptoJS from '../../dist/crypto-js.js';     //aes加密
import drawQrcode from 'weapp-qrcode';
const jsQR = require('jsqr'); 

Page({
  data: {
    deviceId: '',
    serviceId: '',
    devices:[],
    characteristicId1: '',
    characteristicId2: '',
    device: {
      name: '',
      signalStrength: 70
    },
    rotate_Counter: 0,                //用于接收传递过来的轮转数 / Used to receive the number of rotations passed
    lastlyrotate_Counter:0,
    speed:'00',
    batteryPowerPercentage:100,
    mileageavailable:'检测中',
    Batterylockstate:-1,
    ifConnect:0,                     //启动状态  1=>start and 0 => closure
    devicecon:0,                     //是否连接到车 1=>yes and 0 => no
    showingModal:true,               //连接弹窗  Display connection pop-up
    showingUserModal:false,          //用户界面弹窗  Display User pop-up
    ifUserLoad:false,                //用户是否登录  Mark whether the user is logged in
    ifRegisterAction:false,          //是否是注册行为  Mark whether the registration activity is in progress
    mnemonic:'',                     //助记词  save mnemonic
    password:'',                     //密码    save password
    mnemonicAgain:'',                //二次确认  Second confirmation
    iconSrc1:'',                     //展示助记词格式是否正确图片的路径  image path
    iconSrc2:'',                     //展示密码格式是否正确图片的路径   image path
    iconSrc3:'',                     //展示确认助记词是否正确的路径   image path
    passwordOK:false,                //说明密码可以使用   Description Password can be used
    mnemonicOK:false,                //说明助记词可以使用   Description: Mnemonics can be used
    mnemonicAgainOK:false,           //说明再次输入没有问题   It means there is no problem with re-entering
    privateKey:'',                   //私钥，由助记词生成   ns
    wallet:'',                       //钱包，相当于账户     ns
    userName:'BIKEUSER',             //用户名   ns
    userPhoto:'',                    //用户头像     ns
    lastlyConnectBLE:'',             //ns
    connectingName:'检测中',          //最多显示6个字   Display up to 6 characters
    UUIDOfSTM:'',                    //本次链接设备的UUID(STM32的CPU序列号)   The UUID of the device being linked 
    UsingDeviceChat:'',
    UsingDevicePhone:'',
    RentDeviceChat:'',               //租借车的社交账号链接    Social media account link for renting a car
    RentDevicePhone:'',
    UsingcarVersion:'',              //存放当前车辆软件版本号   Stores the current vehicle software version number
    Phone:'',                        
    chat:'',
    connectingDeviceID:'',
    jsonDataString: '',              // 用于存储 JSON 数据的字符串
    ifUserInfo:false,                //是否已经储存账户信息
    ifShowUserInfo:false,            //点击跳跃到基本信息栏   Click to jump to the basic information column
    ifMyDevice:false,                //显示为是否为我的车     Show as My Car
    showingRentModal:false,          //是否显示出借相关弹窗   Whether to display loan-related pop-up windows
    rentAddressInput:'',
    ifOpenBattery:'no',
    RentDay:'',
    RentTime:'',
    ifTrustRent:'no',
    showChangePAW:false ,            //进入具体修改电话和微信的界面   
    ifRentopenBattery:'',            //记录如果是租界用户能不能开座舱锁   if RentUser can open battery lock
    whenRentCanUsedTo:'',            //记录租借用户可以使用设备到什么时候   when the rentuser can used to
    showNeedRentModal:false,         //需要借用设备时展示    Show when you need to borrow equipment
    showTransferDevice:false,        //转让设备界面   Transfer device interface
    transformInput:'',
    showMyDevice:false,              //显示我的设备页面  init f   Display My Devices page
    myDevice:[] ,                    //用于存储已有的设备   Used to store existing equipment
    ifList:true,                     //是在列表中还是单个设备   Is it in a list or a single device
    checkingDevice:{rentUser:[]},    //当前设备名字   Current device name
    qrCodeImagePath:'',              //存放二维码路径   Path to store QR code
    setQrTimeModal:false,            //show the set time limit modal
    range: [1, 2, 3, 4, 5],          //range of time limit
    selectedValue: 3,                //default value
    showGeneratedQR:false,           //select time frist and then generate a QR code
    AuthorizationQRcodePath:'',
    rentNeedAuthor:false,            //rent user need qr authorize
    haveGetConnet:0,             //The first command after restarting the connection will fail   
    usingDeviceWallet:'',
  },
  onLoad(options) {
    getApp().initializeBluetooth();
    this.wheatherHaveWallet();
  },
/**
 * @methodName        wheatherHaveWallet
 * @description       Init method // 初始化方法
 * @param             none    // 没有参数
 * @note              wallet  // store 中的钱包地址
 * @returns           none    // 没有返回值
 * @see               updateLoadUser //  加载其他初始数据                            
 */
  wheatherHaveWallet:function(){
    const wallet = wx.getStorageSync('walletAddress');
    if (wallet) {
      this.setData({ifUserLoad:true,})
      this.updateLoadUser();
  } else {
      //Entering the UI without detecting an account / 未检测到账号就进入用户界面
      this.setData({showingUserModal:true,ifRegisterAction:true})
  }
  },
 /**
 * @methodName        updateLoadUser
 * @description       Init data// 初始化数据方法
 * @note              encryptPrivateKey // 经过aes加密的私钥
 * @note              iv                // 用于解密私钥的iv
 * @note              passWord          // 设置的密码，用于转让操作
 * @note              UsingDeviceChat   // 传入社交名片二维码生成的连接
 * @note              UsingDevicePhone  // 存入的电话号码
 * @note              myDevice          // 储存所有属于“我”的设备
 * @returns           none              // 没有返回值
 * @see               decryptPrivateKey // 使用aes解密得到私钥                           
 */
  updateLoadUser:function(){
    const encryptPrivateKey = wx.getStorageSync('encryptedPrivateKeyEncryptedn'); 
    const iv = wx.getStorageSync('encryptedPrivateKeyIv');   
    const passWord = wx.getStorageSync('passWord');
    const privateKey = this.decryptPrivateKey(encryptPrivateKey,iv,passWord);
    const wallet = new ethers.Wallet(privateKey);
    const StorePhone = wx.getStorageSync('UsingDeviceChat');
    const StoreChat = wx.getStorageSync('UsingDevicePhone');
    const myDeviceNow = wx.getStorageSync('myDevice');
    if(myDeviceNow && Array.isArray(myDeviceNow)){
      this.setData({myDevice:myDeviceNow})
    }else{this.setData({myDevice:[]})}
    this.setData({              
      privateKey:privateKey,
      wallet:wallet,
      UsingDeviceChat:StorePhone,
      UsingDevicePhone:StoreChat, 
    })   
  },

  onReady() {
    this.loadDevices();
    if(this.data.UsingDevicePhone!='' && this.data.UsingDeviceChat!=''){this.setData({ifUserInfo:true})}
    this.checkConnectionAndAutoLink();
  },
//Timer 1
  checkConnectionAndAutoLink: function() {
    this.checkConnectionStatusInterval = setInterval(() => {
      const currentApp = getApp();  
      console.log('waiting')
      if (currentApp.ifCounldConnect === true) {  
        this.automaticLink(); 
        clearInterval(this.checkConnectionStatusInterval); 
      }
    }, 500);  
  },
//Timer 2
  getIdentityInterval:function(){
    this.identityInterval = setInterval(()=>{
      if(this.data.haveGetConnet > 0){
        clearInterval(this.identityInterval);
      }else if(this.data.devicecon === 1){
        this.sendsecretUnfixedCommand('verifyID');
      }
    },1500)
  },

  onShow() {
    this.getIdentityInterval();
  },
  /**
 * @methodName        automaticLink
 * @description       Automatically connect to the last connected device // 自动连接
 * @param             none             // 没有参数
 * @note              lastlyConnectBLE // 储存在store中的上次连接设备的deciveID
 * @returns           none             // 没有返回值
 * @see               FindConnectingAndReConnect //  加载其他初始数据                            
 */
  automaticLink:function(){
    const lastlyConnectBLE = wx.getStorageSync('lastlyConnectBLE');
    if(lastlyConnectBLE != '' && this.data.ifUserLoad === true){
        this.FindConnectingAndReConnect(lastlyConnectBLE)
        this.setData({
          showingModal:false
        })
    }
  },
/**
 * @methodName        FindConnectingAndReConnect
 * @description       connect // 连接传输过来的deviceID
 * @param             data             // lastlyConnectBLE
 * @returns           none             // 没有返回值
 * @see               DoforDevice      // 蓝牙连接方法                           
 */
  FindConnectingAndReConnect:function(data){
    wx.getConnectedBluetoothDevices({
      services: [],
      success:(res)=>{
        if(res.devices.length>0){
          wx.closeBLEConnection({
            deviceId: res.devices.deviceID,
            success:()=>{
              this.DoforDevice(data,null);
            }
          })
        }else{this.DoforDevice(data,null);}
      }
    })
  },

  onUnload() {
    console.log(this.data.connectingDeviceID)
      wx.closeBLEConnection({
        deviceId: this.data.connectingDeviceID,
      })
  },


/**
 * @methodsName            aroundDeviceBluetoothConnect
 * Connect a Bluetooth device and disconnect any remaining Bluetooth connections.
 * 连接蓝牙设备并断开之前残留的蓝牙连接。
 * @param {Object} event - 触发事件对象，包含触发设备的信息。
 * Trigger event object, including the information of the trigger device.
 * @param {Object} event.currentTarget - 当前目标对象。
 * The current target object.
 * @param {Object} event.currentTarget.dataset - 包含设备数据的字段，如 `deviceID` 和 `name`。
 * - Fields containing device data, such as `deviceID` and `name`.
 * @see DoforDevice  Function that performs device operation.\执行设备操作的函数                     
 * @see hideModal    Hide pop-up window for connecting devices\隐藏连接设备的弹窗                 
 */
aroundDeviceBluetoothConnect:function(event){
  wx.getConnectedBluetoothDevices({         //Check if there are any unconnected devices
    services: [],                           //确认是否有未断开设备
    success:(res)=>{
      if(res.devices.length>0){            
        console.log(res);
        wx.closeBLEConnection({
          deviceId: res.devices.deviceID,
          success:()=>{
            const device = event.currentTarget.dataset.device;
            const deviceID = device.deviceID;
            const { name } = device;
            this.DoforDevice(deviceID,name);
            this.hideModal();
          },
        })
      }else{
        const device = event.currentTarget.dataset.device;
        const deviceID = device.deviceID;
        const { name } = device;
        this.DoforDevice(deviceID,name);
        this.hideModal();
      }
    },
  })
},
/**
 * Method to create a Bluetooth connection/创立蓝牙连接的方法
 * @param deviceID    The id of the device to connect to/将要连接设备的id
 * @param name        The name of the device to connect to/将要连接设备的名字
 * @see getServices   Method to get the service ID/获取服务id的方法                              
 */
DoforDevice:function(deviceID,name){
  wx.createBLEConnection({
    deviceId: deviceID,
    connectionPriority:'high',
    fail:()=>{wx.showToast({title: '连接失败了',icon:'none',duration:1000,})
    },success:()=>{
      this.getServices(deviceID);      
      this.setData({
        lastlyConnectBLE:deviceID,
        connectingName:name,
        connectingDeviceID:deviceID,
      })
    },
  })
},
/**
 * Method to get the service ID/获取服务id的方法 
 * @param deviceID            The id of the device connecting / 连接设备的id
 * @see   getCharacteristics  Method to get feature ID / 获取特征id的方法                        
 */
getServices:function(deviceID){
  wx.getBLEDeviceServices({
    deviceId: deviceID,
    success:(res)=>{
      if (res.services.length > 0) {
        const targetService = res.services.find(service => service.uuid.startsWith('0000FFE0')); 
        if(targetService){
          const serviceID = targetService.uuid;
          this.getCharacteristics(deviceID, serviceID); 
        }
      }
    },fail:()=>{wx.showToast({ title: '连接出现问题',icon:'error',duration:1000})}
  })
},
/**
 * Method to get feature ID / 获取特征id的方法  
 * @param deviceID            The id of the device connecting / 连接设备的id
 * @param serviceId           The serviceId of the device connecting / 连接设备的服务id
 * @see updateDeviceInformation  Method to update information to the global and display                         
 */
getCharacteristics: function(deviceId, serviceId){
  wx.getBLEDeviceCharacteristics({
    deviceId: deviceId,
    serviceId: serviceId,
    success:(res)=>{
      if (res.characteristics.length > 0){
        const characteristicIds = [];
        res.characteristics.forEach(characteristics => {
          characteristicIds.push(characteristics.uuid); 
        });this.updateDeviceInformation(deviceId, serviceId, characteristicIds); 
      } 
    },
  })
},
/**
 * Method to update information to the global and display  / 更新信息到全局并调用的方法  
 * @param deviceID            The id of the device connecting / 连接设备的id
 * @param serviceId           The serviceId of the device connecting / 连接设备的服务id
 * @param characteristicIds   The service characteristic group of the device connected to
 *                            连接到的设备的服务特征组
 * @see listentoBlue  Method to update information to the global and display
 * @see startSignalStrengthUpdate  Method to update connecting device signal strength
 * @note                      A save was made / 进行了一次保存
 *       The device will automatically connect next time you use it / 下一次使用将自动连接设备                       
 */
updateDeviceInformation: function(deviceId, serviceId, characteristicIds) {
  const char1 = characteristicIds.length > 0 ? characteristicIds[0] : null;
  const char2 = characteristicIds.length > 1 ? characteristicIds[1] : null;
  this.setData({
    deviceId: deviceId,
    serviceId: serviceId,
    characteristicId1: char1,
    characteristicId2: char2,
  }, () =>{
    this.listentoBlue();
    this.startSignalStrengthUpdate();
    wx.setStorageSync('lastlyConnectBLE', this.data.lastlyConnectBLE);
  });
},
/**
 * @methodName        listentoBlue
 * @description       Used to monitor Bluetooth transmission information / 用于监听蓝牙传输信息
 * @param             none             // 没有参数
 * @returns           none             // 没有返回值
 * @note              deviceId:connnecting deviceID
 *                    serviceId:connnecting device's serviceID
 *                    characteristicId:connnecting device's characteristicId[0]
 * @see               bufferToString   // Convert data to characters-将数据转换为字符    
 * @see               DealNowRecieved  // Process the currently received data
 *                                       -处理当前接收到的数据                     
 */
listentoBlue:function(){
  wx.notifyBLECharacteristicValueChange({
    deviceId: this.data.deviceId,
    serviceId: this.data.serviceId,
    characteristicId: this.data.characteristicId2,
    state: true,
    success: () => {
      this.setData({
        devicecon:1,
      })
    },
  }); wx.onBLECharacteristicValueChange((characteristic) => {
      const data = this.bufferToString(characteristic.value); 
      this.DealNowRecieved(data);
      });
},
/**
 * @methodName        DealNowRecieved
 * @description       Process the currently received data-处理当前接收到的数据
 * @param             data             // characteristic recive-特征值的变化数
 * @returns           none             // 没有返回值
 * @note              There is a problem with Android data reception, so all data needs to be received segment
 *                    by segment
 *                    安卓数据接收有问题，所有需要一段一段的接收数据
 * @see               CutCompleteData  // Processing a complete piece of data
 *                                     // 处理一段完整的数据                      
 */
  DealNowRecieved:function(data){
    this.setData({
      jsonDataString:this.data.jsonDataString+data,     
    });
    if((this.data.jsonDataString).includes('<BN') && (this.data.jsonDataString).includes('OR>')){
      this.CutCompleteData();
    }
  },
 /**
 * @methodName        CutCompleteData
 * @description       Extract and process data in a specific format-提取并处理特定格式的数据
 * @param             none             // 无参数
 * @returns           none             // 没有返回值
 * @see               HandleCarve      // Processing two separate pieces of data
 *                                     // 处理分开的两段数据   
 * @note              The heap space requirement of the Cjson library forces us to divide the data into 
 *                    two parts   and use +++ to connect them.
 *                    Cjson库对于堆空间的要求使得我们只能将数据分为两段并使用+++连接                   
 */ 
  CutCompleteData:function(){
    const match = this.data.jsonDataString.match(/<BN([\s\S]*?)OR>/);
    if (match && match[1]) {
      const wrappedData = match[1];  // 提取 <BG ... OR> 中的数据部分
      const [part1, part2] = wrappedData.split('+++');
      this.HandleCarve(part1,part2);
      this.setData({
        jsonDataString: ''
      });
    }
  },
/**
 * @methodName        HandleCarve
 * @description       Method to parse and process two pieces of data separately
 * @param             part1            // The first part of the parameters contains the basic information
 *                                        of the vehicle 
 * @param             part2            // The second part of the parameters contains the master's information
 *                                        of the vehicle 
 * @returns           none 
 * @see               handleDeviceStatus      // Processing the part1
 * @see               handleUserInfo          // Processing the part2              
 */ 
  HandleCarve:function(part1,part2){
    const parsedData1=JSON.parse(part1);const parsedData2=JSON.parse(part2);
    console.log(parsedData1);console.log(parsedData2);
    if(parsedData1.BatteryState){
      this.handleDeviceStatus(parsedData1);
    }if(parsedData2.Name && parsedData2.Wallet){
      this.handleUserInfo(parsedData2);
    }
  },
/**
 * @methodName        handleUserInfo
 * @description       Method to Processing of relevant data about users
 * @param             data              //the processed data about the device's superuser
 * @returns           none             
 * @see               sendMyPhoneAndChat      // update the info saved in the device
 * @see               addAMyDevice            // Designed for V1.0 to add device information 
 *                                               to user information             
 */ 
  handleUserInfo:function(data){
    const name = data.Name;
    const userWechat = data.chat;
    const userPhone = data.Phone;
    const BikeAddress = data.Wallet;
    this.setData({connectingName:name,usingDeviceWallet:BikeAddress})
    if(BikeAddress === this.data.wallet.address.substring(2)){ //说明是自己的车
      this.setData({ifMyDevice:true})                          //标记
      if((userWechat != this.data.UsingDeviceChat || userPhone != this.data.UsingDevicePhone)&&(this.data.UsingDeviceChat.length>0||this.data.UsingDevicePhone.length>0)){
        this.sendMyPhoneAndChat();                             //update the phone and chat
      }
      this.addAMyDevice();
    }else{this.setData({ifMyDevice:false})
    //for rentuser to get the superuser's info to cantact 
    if((userWechat!=''|| userPhone!='')&&this.data.ifMyDevice === false){
      this.setData({RentDevicePhone:userPhone,RentDeviceChat:userWechat})
    }
  }
  },
/**
 * @methodName        handleDeviceStatus
 * @description       Method to Processing of relevant basic data about driving device
 * @param             data                    //the processed data about the device's basical info
 * @returns           none             
 * @see               calculateWhen      // Calculate the remaining time of the rent user
 * @see               DoToBatteryVoltage // Calculate the remaining battery power of the device 
 * @see               DoToBatteryState   // Check battery lock status
 * @see               DoToRatate         // Calculate the speed      
 * @see               ShowRunnigError    // Respond to the signal from the running controller   
 * @see               DealRunningStatus  // Respond to vehicle operating status
 * @see               DealTimeAndJudgeIfNeedAuthor  Determine if authorization is required
 */ 
  handleDeviceStatus:function(data){
    const batteryVoltage = data.BatteryVoltage;
    const batteryState = data.BatteryState;
    const rotate = data.Rotate;
    const uuid = data.UUID;
    const ERR = data.ERR;
    const Version = data.V;
    const RunningStatus = data.BS;
    const NowTime = data.Now
    if(this.data.ifMyDevice===false){
      const CanrentOpenBattery = data.RB;
      const RemainTime = data.TLim;
      console.log(data.T);
      if(data.T === 'N'){               
        // First confirm whether you trust,then check the time
        this.DealTimeAndJudgeIfNeedAuthor(NowTime);
      }else if(data.T === 'Y'){this.setData({rentNeedAuthor:false})}
      this.setData({ifRentopenBattery:CanrentOpenBattery})
      this.calculateWhen(RemainTime);
    }
    this.doTobatteryPower(batteryVoltage);
    this.DoToBatteryState(batteryState);
    this.DoToRatate(rotate);
    this.setData({UUIDOfSTM:uuid,UsingcarVersion:Version});
    this.ShowRunnigError(ERR);
    this.DealRunningStatus(RunningStatus);
  },
/**
 * @methodName        DealTimeAndJudgeIfNeedAuthor
 * @description       Method to determine whether authorization update time is required
 * @param             time     the timestamp 
 * @returns           none             
 */ 
  DealTimeAndJudgeIfNeedAuthor:function(time){
    const timeStamp = Math.floor(Date.now() / 1000);
    const timeDifferenceThreshold = 300;
    if((timeStamp-timeDifferenceThreshold)>time){          
      //The time gap is too large, indicating that the time has not been updated.
      this.setData({rentNeedAuthor:true})
    }else{
      //If the time difference is small, stm32 will automatically correct it
      this.setData({rentNeedAuthor:false})
    }
  },
/**
 * @methodName        DoToBatteryState
 * @description       Method to respond Battery lock status
 * @param             data         //the string related to the batterylock status
 * @returns           none             
 * @note              battery1     means the lock is opening
 *                    battery2     locking
 *                    battery3     fail to open lock
 *                    battery4     fail to lock
 *                    Batterylockstatte   -1=>init status; 1=>opening; 0=>locking  
 */ 
  DoToBatteryState:function(data){
    if(data === 'battery1'){
      if(this.data.Batterylockstate != 1){
        wx.showToast({ title: '开锁成功',icon:'success',duration:1000})
        this.setData({Batterylockstate:1})
      }
    }else if(data === 'battery2'){
      if(this.data.Batterylockstate != 0){
        wx.showToast({ title: '关锁成功',icon:'success',duration:1000})
        this.setData({Batterylockstate:0})
      }
    }else if(data === 'battery3'){wx.showToast({title: '开锁失败了',icon:'error',duration:1000})}
    else if(data === 'battery4'){wx.showToast({title: '关锁失败了',icon:'error',duration:1000})}
  },
/**
 * @methodName        DoToRatate
 * @description       Method to get the speed of driving device
 * @param             data         //include rotate number
 * @returns           none             
 */ 
  DoToRatate:function(data){
    this.setData({lastlyrotate_Counter:this.data.rotate_Counter,}); //保留上一次的值
    const mileageMatch = data.match(/R:\s*(\d+)/);
    if (mileageMatch) {
      const mileage = parseInt(mileageMatch[1], 10);
      this.setData({rotate_Counter: mileage});
    }
  },
/**
 * @methodName        ShowRunnigError
 * @description       Method to respond all kinds of error and response
 * @param             ERR            //the sring recieved
 * @returns           none 
 * @see               addAMyDevice   //run when ERR === RegisterOk //means add the connecting device to mine  
 * @see               updateRentUserInfo   //run when ERR === getRent&&UpdateOld 
 *                                           means updatae old rentuser or add a new rentuser
 * @see               deleteMydevice //run when ERR === ChangeSuperOK 
 *                                     Delete a device from My Devices after transferring it
 */ 
  ShowRunnigError:function(ERR){
    if(ERR){
      if(this.data.haveGetConnet < 2){
        this.setData({haveGetConnet:this.data.haveGetConnet + 1});
        return;
      }
      if(ERR === 'UserErr'){wx.showToast({title: '您没有使用此设备的权限',icon:'error',duration:1000})}
      else if(ERR === 'CommandErr'){wx.showToast({title: '出现了问题哦',icon:'error',duration:1000})}
      else if(ERR === 'FormatErr'){wx.showToast({title: '出现了问题哦',icon:'error',duration:1000})}
      else if(ERR === 'RegisterOk'){this.addAMyDevice()}
      else if(ERR === 'RegisterErr'){wx.showToast({title: '注册失败，请重试',icon:'error',duration:1000})}
      else if(ERR === 'AddRrentErr'){wx.showToast({title: '添加租借失败，请重试',icon:'error',duration:1000})}
      else if(ERR === 'getRent'){this.updateRentUserInfo()}
      else if(ERR === 'UpdateOld'){this.updateRentUserInfo()}
      else if(ERR === 'ChangeSuperOK'){this.deleteMydevice()}
      else if(ERR === 'ChangeSuperErr'){wx.showToast({title: '转让失败，请重试',icon:'error',duration:1000})}
      else if(ERR === 'addPACOK'){wx.showToast({title: '添加用户信息成功',icon:'success',duration:1000})}
      else if(ERR === 'TimeErr'){wx.showToast({title: '时间错误',icon:'error',duration:1000})}
      else if(ERR === 'SignCmdErr'){wx.showToast({title: '命令有误',icon:'error',duration:1000})}
      else if(ERR === 'SignAddErr'){wx.showToast({title: '地址错误',icon:'error',duration:1000})}
      else if(ERR === 'IDErr'){wx.showToast({title: '出现了问题哦，请重试',icon:'error',duration:1000})}
      else if(ERR === 'Timeup'){
        this.setData({rentNeedAuthor:false})
        wx.showToast({title: '时间已更新',icon:'success',duration:1000})}
    }
  },
  /**
 * @methodName        DealRunningStatus
 * @description       Method to change the device start button
 * @param             data         //1 or 0 // 1 for opening and 0 for locking
 * @returns           none             
 */ 
  DealRunningStatus:function(data){
    if(data === 1){
      if(this.data.ifConnect != 1){
        wx.showToast({ title: '已启动',icon:'success',duration:1000})
        this.setData({ifConnect:1})}
      }           
    else if(data === 0){
      if(this.data.ifConnect != 0){
        wx.showToast({ title: '已关闭',icon:'success',duration:1000})
        this.setData({ifConnect:0})}
      }
  },
/**
 * @methodName        calculateWhen
 * @description       only for rentuser:calculate Remaining riding time
 * @param             data     a timestamp string that superuser set for the rentuser
 * @returns           none             
 */ 
  calculateWhen:function(data){
    const timestampInSeconds = parseInt(data);const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTimestamp - timestampInSeconds);
    const hours = Math.floor(timeDifference / 3600);const minutes = Math.floor((timeDifference % 3600) / 60);
    const TimeGet = hours +':'+ minutes;
    this.setData({whenRentCanUsedTo:TimeGet})
  },
/**
 * @methodName        addAMyDevice
 * @description       add conncting device to mydevice
 * @param             none
 * @returns           none             
 */ 
  addAMyDevice:function(){
    const ifHavingThisDevice = this.data.myDevice.find(item => item.name === this.data.connectingName);
    console.log(this.data.UsingcarVersion,this.data.UUIDOfSTM,this.data.connectingName)
    if(!ifHavingThisDevice && this.data.UsingcarVersion!='' && this.data.UUIDOfSTM!='' && this.data.connectingName!=''){
      const newDevice ={
        version:this.data.UsingcarVersion,
        id:this.data.myDevice.length>0 ? this.data.myDevice[myDevice.length-1].id+1 : 1,
        name:this.data.connectingName,
        uuid:this.data.UUIDOfSTM,
        rentUser:[]
      };const updatedMyDevice = [...this.data.myDevice, newDevice];
      console.log(updatedMyDevice);
      this.setData({ myDevice: updatedMyDevice });
      try {
        wx.setStorageSync('myDevice', updatedMyDevice);
        const content = `您已成为${this.data.connectingName}的车主`
        wx.showModal({title: '注册成功', content:content,confirmText:'好',showCancel:false})
      } catch (error) {
        console.error('设备注册失败:', error);
        wx.showToast({ title: '注册失败', icon: 'error', duration: 1000 });
      }
    } 
  },
/**
 * @methodName        getBriefAdd
 * @description       Simplify the 42-bit address
 * @param             add       42-bit address or 40-bits address without 0x
 * @returns           brief     Simplified address   
 * @example           sadd = getBriefAdd(add) === '1234...5678'          
 */ 
  getBriefAdd:function(add){
    let address = add.startsWith('0x') ? add.slice(2) : add;
    if(address.length === 40){
      const start = address.slice(0,4);
      const end = address.slice(-4);
      const brief = start + '...' +end;
      return brief;
    }
  },
  /**
 * @methodName        getRentTimeTo
 * @description       Calculate the available time and display it
 * @param             rentDay       The expiration date set for rentuser
 * @param             rentTime      The expiration time set for rentuser
 * @returns           realTime      Combined time   
 * @example           realTime = getRentTimeTo(2024-11-24,14:24) === '2024-11-24-14:24'          
 */ 
  getRentTimeTo:function(rentDay,rentTime){
    let Time;
    if(rentTime.length == 0){Time = '23:59'}else{Time = rentTime}
    const realTime = rentDay +'-'+ Time;
    return realTime;
  },
/**
 * @methodName        deleteMydevice
 * @description       delete connecting device from myDevice
 * @param             none
 * @returns           none        
 */ 
  deleteMydevice:function(){
    const willDeleteDeviceName = this.data.connectingName;
    let newId = 1;
    const updatedDevice = this.data.myDevice
      .filter(item => item.name !== willDeleteDeviceName)
      .map(item => ({ ...item, id: newId++ }));
    this.setData({myDevice:updatedDevice});
    wx.setStorageSync('myDevice', updatedDevice,);
    wx.showToast({title: '转让成功',icon:'success',duration:1000})
  },
/**
 * @methodName        updateRentUserInfo
 * @description       update the rentuser info in connecting device
 * @param             none
 * @returns           none   
 * @see               getBriefAdd
 * @see               getRentTimeTo     
 */ 
  updateRentUserInfo: function () {
    const needUpdateDevice = this.data.myDevice.find(item => item.name === this.data.connectingName);
    if (needUpdateDevice) {
      const needUpdateRentUserId = this.getBriefAdd(this.data.rentAddressInput);
      const needUpdateTime = this.getRentTimeTo(this.data.RentDay, this.data.RentTime);
      const userIndex = needUpdateDevice.rentUser.findIndex(user => user.add === needUpdateRentUserId);
      const newRentUser = {
        add: needUpdateRentUserId,
        time: needUpdateTime,
        open: this.data.ifOpenBattery === 'yes',
        trust: this.data.ifTrustRent === 'yes',
      };
      if (userIndex !== -1) {
        needUpdateDevice.rentUser[userIndex] = newRentUser;
      } else {
        needUpdateDevice.rentUser.push(newRentUser);
      }
      const updatedMyDevice = this.data.myDevice.map(item =>
        item.name === this.data.connectingName ? needUpdateDevice : item
      );
      this.setData({ myDevice: updatedMyDevice,rentAddressInput:'',ifOpenBattery:'no',RentDay:'',RentTime:'',ifTrustRent:'no',});
      wx.setStorageSync('myDevice', updatedMyDevice,);
      wx.showToast({
        title: userIndex !== -1 ? '已更新租借用户信息' : '已添加租借用户信息',
        icon: 'success',
        duration: 1000,
      });
    }
  },
/**
 * @methodName        judgeIdentityAndSendCommand
 * @description       Determine whether to update the time and send a command
 * @param             event           Button binding command
 * @returns           none   
 * @see               sendsecretUnfixedCommand    the way to send command to stm32
 * @see               dealUptaTimeQR              Processing authorization QR code
 * @note              Because Android has a length limit of 20 ; So we tried different sending formats
 */ 
judgeIdentityAndSendCommand:function(event){
  const command = event.currentTarget.dataset.command;
  //1.superuser   2.rentuser but authorization is not required
  if(this.data.ifMyDevice === true || this.data.rentNeedAuthor === false){
    this.sendsecretUnfixedCommand(command);
    wx.showToast({title: '已发送，请等待响应',icon:'success',duration:1000})
  }else{
    wx.scanCode({
      success:(res)=>{
        console.log(res);
        this.dealUptaTimeQR(res);
      },fail:()=>{
        wx.showToast({title: '请扫描授权码',icon:'error',duration:1000})
      }
    })
  }
},
/**
 * @methodName        dealUptaTimeQR
 * @description       Processing QR code data
 * @param             data           Parsed QR code data
 * @returns           none   
 * @see               sendByTwenty        the way to send command to stm32
 */
dealUptaTimeQR:function(data){
  const paraData = JSON.parse(data.result)
  if(paraData.l && paraData.t && paraData.p &&paraData.s){
    const limitTime = paraData.l;
    const dateNow = Math.floor(Date.now() / 1000);
    const time = paraData.t;
    if(dateNow < (time+60*limitTime)){
      const Devicepubkey = paraData.p;
      const deviceSignature = paraData.s;
      const time = paraData.t;
      const cmd={
        TimeStamp:time,
        command:'MC',
        UUID:this.data.UUIDOfSTM
      }
      var cmdstr=JSON.stringify(cmd)
      const obj = {
        cmd:cmdstr,
        PubKey: Devicepubkey,
        signature:deviceSignature,
        address:'0x'+this.data.usingDeviceWallet,
      }
      const jsonString = '<' + JSON.stringify(obj) + '>';
      this.sendByTwenty(jsonString);
    }else{
      wx.showToast({title: '二维码过期',icon:'error',duration:1000})
    }
  }else{
    wx.showToast({title: '二维码错误',icon:'error',duration:1000})
  }
},
/**
 * @methodName        sendsecretUnfixedCommand
 * @description       same as above but have not button,so his is a method that sends an unfixed command.
 * @param             data          command need to be send
 * @returns           none   
 * @see               sendByTwenty    the way to send command to stm32
 * @note              Because Android has a length limit of 20 ; So we tried different sending formats
 */ 
sendsecretUnfixedCommand:function(data){
  const command = data;
  const cmd={
    TimeStamp:Math.floor(Date.now() / 1000),
    command:command,
    UUID:this.data.UUIDOfSTM
  }
  var cmdstr=JSON.stringify(cmd)
  const signature =  this.data.wallet.signMessageSync(cmdstr);
  const obj = {
    cmd:cmdstr,
    PubKey: this.data.wallet.signingKey.publicKey,
    signature:signature,
    address:this.data.wallet.address
};
  const jsonString = '<' + JSON.stringify(obj) + '>';
  this.sendByTwenty(jsonString);
},
/**
 * @methodName        sendMyPhoneAndChat
 * @description       Method to send update phone and chat info command
 * @param             none
 * @returns           none   
 * @see               sendByTwenty    the way to send command to stm32
 * @note              Because Android has a length limit of 20 ; So we tried different sending formats
 */ 
sendMyPhoneAndChat:function(){
  const command = {
    Phone:this.data.UsingDevicePhone,
    Wechat:this.data.UsingDeviceChat,
  }
  var commandstr= JSON.stringify(command);
  const cmd={
    TimeStamp:Math.floor(Date.now() / 1000),
    command:'addPAC'+commandstr,
    UUID:this.data.UUIDOfSTM
  }
  var cmdstr=JSON.stringify(cmd)
  const signature =  this.data.wallet.signMessageSync(cmdstr);
  const obj = {
    cmd:cmdstr,
    PubKey: this.data.wallet.signingKey.publicKey,
    signature:signature,
    address:this.data.wallet.address
};const jsonString = '<' + JSON.stringify(obj) + '>';
  console.log(jsonString);
  this.sendByTwenty(jsonString);
},
/**
 * @methodName        sendByTwenty
 * @description       Method to send data to stm32
 * @param             JsonString      the command will be processed to a json sring and be send here
 * @returns           none   
 * @see               sendData        Method to sned data to stm32
 */ 
sendByTwenty:function(JsonString){
  /*{"cmd":"{\"TimeStamp*/let startIndex = 0; 
  /*12345678901234567890*/const everySize = 20;
  const needTime = Math.ceil(JsonString.length / everySize);
  for(let i=0;i<needTime;i++){
    const endIndex = Math.min(startIndex + everySize, JsonString.length);
    const batch = JsonString.slice(startIndex, endIndex);
    this.sendData(batch);
    startIndex = endIndex;
  }
},
/**
 * @methodName        sendData
 * @description       Method to send data to stm32 by bluetooth
 * @param             command            the command will be send
 * @returns           none   
 * @see               stringToBuffer     string to unit8-t  data
 * @note              
 */ 
sendData: function(command) {
  wx.writeBLECharacteristicValue({
    characteristicId: this.data.characteristicId1,
    deviceId: this.data.deviceId,
    serviceId: this.data.serviceId,
    value: this.stringToBuffer(command), 
    fail: () => {
      if(this.data.haveGetConnet > 0){
        wx.showToast({title: '发送失败',icon: 'none',duration: 1000,});
      }
    },
  });
},
/**
 * @methodName        stringToBuffer
 * @description       Method to convert string to unit8-t  data
 * @param             str           the string that need to be converted
 * @returns           none   
 */ 
stringToBuffer: function(str) {
  const buffer = new ArrayBuffer(str.length);
  const dataView = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    dataView[i] = str.charCodeAt(i);
  }
  return buffer;
},
/**
 * @methodName        bufferToString
 * @description       Method to convert unit8-t data to string 
 * @param             buffer           the unit8-t data that need to be converted
 * @returns           none   
 */ 
bufferToString: function(buffer) {
  const dataView = new Uint8Array(buffer);
  return String.fromCharCode.apply(null, dataView);
},
/**
 * @methodName        startSignalStrengthUpdate
 * @description       Method to refresh Bluetooth signal strength
 * @param             none
 * @returns           none  
 * @see               getDeviceRSSI   Get the Bluetooth signal strength at this connection status
 */ 
startSignalStrengthUpdate: function() {
  this.setData({
    signalUpdateInterval: setInterval(() => {
      this.getDeviceRSSI(); 
    }, 2000)                                       // every 2s
  });
},
stopSignalStrengthUpdate: function() {
  clearInterval(this.data.signalUpdateInterval);
  this.setData({signalUpdateInterval: null});
},
/**
 * @methodName        getDeviceRSSI
 * @description       Method to Get the Bluetooth signal strength at this connection status
 * @param             none
 * @returns           none  
 */ 
getDeviceRSSI: function() {
  wx.getBLEDeviceRSSI({
    deviceId: this.data.deviceId,
    success: (res) => {
      this.setData({'device.signalStrength': res.RSSI});
    },
  });
},
/**
 * @methodName        doTobatteryPower
 * @description       Receive voltage value and calculate power
 * @param             data      the device voltage recieved from stm32
 * @returns           none  
 */ 
  doTobatteryPower:function(data){
    if (data){
      const powerNum = parseFloat(data);
      if(powerNum ){
        let percentage;
        if(powerNum <= 53.4 && powerNum >= 45){percentage = Math.floor(100 * (powerNum - 45) / (53.4 - 45));}
        else if(powerNum > 53.4){percentage = 100}
        else{ percentage = 0}
        this.setData({batteryPowerPercentage:percentage});
      }
    }
  },
/**
 * @methodName        itineraryCalculate
 * @description       Receive voltage value and calculate power
 * @param             data      the device voltage recieved from stm32
 * @returns           none 
 * @note              There are related issues that have not been resolved 
 */ 
  itineraryCalculate:function(data){
    const calculatedValue = (3.14 * data * 0.4) / 1000;
    this.setData({
      itinerary:parseFloat(calculatedValue.toFixed(1))
    });
  },
  speedCalculate:function(data1,data2){
    const calculatedValue = ((data1-data2)*3.14*0.4)/0.3/3.6;
    const speed = Math.ceil(calculatedValue); // 向上取整
    const speed1 = Math.floor(speed / 10); // 十位数
    const speed2 = speed % 10; // 个位数
    const combinedSpeed = `${speed1}${speed2}`;
    this.setData({
      speed:combinedSpeed
     });
  },
  updateSpeed:function(){                    //每0.3s更新一次速度
    this.speedUpdateInterval = setInterval(() => {
      const data1 = this.data.rotate_Counter;
      const data2 = this.data.lastlyrotate_Counter;
      this.speedCalculate(data1,data2);
    },300);
  },
  stopSpeedUpdate: function() {
    clearInterval(this.speedUpdateInterval); 
  },
  updateItinerary:function(){
    this.itineraryUpdateInterval = setInterval(() => {
      const data = this.data.rotate_Counter;

      this.itineraryCalculate(data);
    },5000);
  },
  stopItineraryUpdate: function() {
    clearInterval(this.itineraryUpdateInterval); 
  },
/**
 * @methodName        showModal;hideModal;showUserModal;hideUserModal;exitRegisterOrLoad
 *                    showRegisterModal;hideRegisterModal;showLoadrModal;hideLoadrModal
 * @description       all these method are used to show some modal related to device
 */ 
  showModal() {
    this.setData({showingModal: true});
  },
  hideModal:function() {
    this.setData({showingModal:false})
  },
  showUserModal:function(){
    this.setData({ showingUserModal:true})
  },
  hideUserModal:function(){
    this.setData({showingUserModal:false})
  },
  showRegisterModal:function(){
    this.setData({ifRegisterAction:true })
  },
  hideRegisterModal:function(){
    this.setData({ifRegisterAction:false})
  },
  showLoadrModal:function(){
    this.setData({ifLoadAction:true})
  },
  hideLoadrModal:function(){
    this.setData({ifLoadAction:false})
  },
  exitRegisterOrLoad:function(){
    this.setData({ifRegisterAction:false})
  },
//used to get device list from app.js
  loadDevices: function() {
    const app = getApp();
    this.setData({devices: app.devices});
  },
//used show the register modal
  userRegister:function(){
    this.showRegisterModal()
  },
//the mothod to respond if the input correct when user Register
  onInputRegister:function(event){
    const helpDO = event.detail.value;
    this.setData({ mnemonic:helpDO});if (helpDO.length >= 10){
      this.setData({
        iconSrc1:'/image/right.png',
        mnemonicOK:true})
    }else if(helpDO.length === 0){
      this.setData({
        iconSrc1:'',
        mnemonicOK:false})
    }else{
      this.setData({
        iconSrc1:'/image/error.png',
        mnemonicOK:false})
    }
  },
//the mothod to respond if the input correct When the user confirms the input
  onInputRegister1:function(event){
    const helpDO = event.detail.value;
    this.setData({
      mnemonicAgain:helpDO
    });if (helpDO === this.data.mnemonic){
      this.setData({
        iconSrc3:'/image/right.png',
        mnemonicAgainOK:true})
    }else if(helpDO.length === 0){
      this.setData({
        iconSrc3:'',
        mnemonicAgainOK:false})
    }else{
      this.setData({
        iconSrc3:'/image/error.png',
        mnemonicAgainOK:false})
    }
  },
//Password input box method
  onInputPassword:function(event){
    const helpDo = event.detail.value;
    this.setData({
      password:helpDo
    });if (helpDo.length === 6 && /^\d{6}$/.test(helpDo)){
      this.setData({
        iconSrc2:'/image/right.png',
        passwordOK:true})
    }else if(helpDo.length === 0){
      this.setData({
        iconSrc2:'',
        passwordOK:false})
    }else{
      this.setData({
        iconSrc2:'/image/error.png',
        passwordOK:false})
    }
  }, 
//Method used to view wallet address and copy it 
walletShow:function(){
    wx.showModal({
      title: '钱包地址',
      content: `${this.data.wallet.address}`,
      confirmText: '复制地址',
      cancelText:'退出',
      success:(res)=>{
        if(res.confirm){
          wx.setClipboardData({
            data: this.data.wallet.address,success:()=>{wx.showToast({
              title: '已复制',duration:1000})}
          })
        }
      }
  })},
//used to show the modal that display the user's phone 
  InFoShow:function(){
    this.setData({ifShowUserInfo:true})
  },
/**
 * @methodName        onRegister
 * @description       Create an account based on the input and save it
 * @param             none
 * @returns           none 
 */ 
  onRegister:function(){
    const privateKey = ethers.sha256(ethers.toUtf8Bytes(this.data.mnemonic));
    const wallet = new ethers.Wallet(privateKey);
    this.setData({                             //此时有数据，相当于已经登录
      privateKey:privateKey,
      wallet:wallet,
      ifUserLoad:true,                         //注册完后更新登录状态，
    })
    const encryptedPrivateKey = this.encryptPrivateKey(privateKey,this.data.password);
    wx.setStorageSync('encryptedPrivateKeyIv', encryptedPrivateKey.iv);               //存储iv
    wx.setStorageSync('encryptedPrivateKeyEncryptedn', encryptedPrivateKey.encrypted);//储存私钥
    wx.setStorageSync('walletAddress', wallet.address);                               //存储钱包地址
    wx.setStorageSync('passWord',this.data.password);                                 //存储密码
    wx.showModal({
      title: '用户须知',
      content: '助记词须妥善保管，遗忘助记词将无法开启车辆',
      showCancel: false, 
      confirmText: '我已知晓',
      complete: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: this.data.mnemonic,
            success:()=>{
              wx.showToast({
                title: '助记词已复制,请自行保存',
                duration: 2000
              })
            }
          })
        }
      }
    })
  },
/**
 * @methodName        generateRandomNumber
 * @description       Generate a random number for iv generation
 * @param             none
 * @returns           CryptoJS.enc.Hex.parse(iv)   Generated iv
 */
  generateRandomNumber:function() {        
    let iv = '';
    for (let i = 0; i < 16; i++) {
        const byte = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        iv += byte;
    }return CryptoJS.enc.Hex.parse(iv);
},
/**
 * @methodName        encryptPrivateKey
 * @description       Used to encrypt private keys
 * @param             privateKey    Private key generated using mnemonics
 * @param             passWord      Set password
 * @returns           json{
 *                        iv:IV for AES decryption
 *                        encrypted:The key returned after encryption}
 */
  encryptPrivateKey: function(privateKey, passWord) {
    const hash = ethers.sha256(ethers.toUtf8Bytes(passWord));
    const key16 = CryptoJS.enc.Hex.parse(hash.slice(2, 34)); // 将前32个字符（16字节）转换为WordArray
    const iv = this.generateRandomNumber();
    const encrypted = CryptoJS.AES.encrypt(privateKey, key16, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return {
      iv: iv.toString(CryptoJS.enc.Base64),
      encrypted: encrypted.toString(), // 返回加密后的密钥
    };
},
/**
 * @methodName        decryptPrivateKey
 * @description       For decryption key
 * @param             encryptedPrivateKey    Encrypted AES key
 * @param             iv                     The iv used when encrypting
 * @param             password               Set password
 * @returns           decrypted              Full private key
 */
  decryptPrivateKey:function(encryptedPrivateKey, iv, password) {
    const hash = ethers.sha256(ethers.toUtf8Bytes(password));
    const key16 = CryptoJS.enc.Hex.parse(hash.slice(2, 34));
    const ivword = CryptoJS.enc.Base64.parse(iv);
    const decrypted = CryptoJS.AES.decrypt(encryptedPrivateKey, key16, {
        iv: ivword,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);            //返回解密后的私钥
},
/*
//电池圈的组件
changeBatteryLevel: function() {
  const newLevel = Math.floor(Math.random() * 101); // 随机生成 0-100 的电量
  this.animateCircle(newLevel); // 启动动画
},
// 动画填充电量
animateCircle: function(newLevel) {
  const targetLevel = newLevel; // 目标电量
  const duration = 1000; // 动画持续时间（毫秒）
  const frameCount = 30; // 帧数
  const startLevel = this.data.currentLevel; // 初始电量
  const change = targetLevel - startLevel; // 变化量
  let currentFrame = 0; // 记录帧数

  const easeInOutQuad = (t) => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  };

  const animate = () => {
    if (currentFrame < frameCount) {
      const progress = currentFrame / frameCount; // 当前进度
      const easedProgress = easeInOutQuad(progress); // 应用缓动效果
      const newLevel = startLevel + change * easedProgress; // 计算新的电量

      this.setData({ currentLevel: newLevel }); // 更新当前电量
      this.updateCircle((newLevel / 100) * 2 * Math.PI); // 绘制当前电量的角度

      currentFrame++;
      setTimeout(animate, duration / frameCount); // 设置下一帧
    } else {
      this.setData({ currentLevel: targetLevel }); // 确保最终值
      this.updateCircle((targetLevel / 100) * 2 * Math.PI); // 最后一次更新
    }
  };

  this.setData({ currentLevel: 0 }); // 确保从 0 开始
  animate(); // 启动动画
},
updateCircle: function(angle) {
  const ctx = wx.createCanvasContext('batterycanvas', this);
  // 获取容器的尺寸
  const query = wx.createSelectorQuery();
  query.select('.batteryBlock').boundingClientRect((rect) => {
    const centerX = rect.width / 2;  // 容器宽度的一半
    const centerY = rect.height /5*2; // 容器高度的一半
    ctx.clearRect(0, 0, rect.width, rect.height);
    // 绘制背景圈
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
    ctx.setStrokeStyle('#ebf5ed');
    ctx.setLineWidth(15);
    ctx.stroke();
    // 绘制电量圈
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, -Math.PI / 2, angle - Math.PI / 2);
    ctx.setStrokeStyle('#9ACD32');
    ctx.setLineWidth(15);
    ctx.stroke();
    ctx.draw();
  }).exec();
},*/
//functions about lending modal 
showRentModal:function(){       //展示出借页面
  this.setData({
    showingRentModal:true
  })
},RentAdressInput:function(e){
  this.setData({
    rentAddressInput: e.detail.value
  })
},RentBatteryChange:function(e){
  const isChecked = e.detail.value;
  this.setData({
    ifOpenBattery: isChecked ? 'yes' : 'no'
  });
},RentChooseDay(e) {
  this.setData({
    RentDay: e.detail.value
  });
},RentChooseTime(e) {
  this.setData({
    RentTime: e.detail.value
  });
},RentTrustChange(e) {
  const isChecked = e.detail.value; 
  this.setData({
    ifTrustRent: isChecked ? 'yes' : 'no'
  });
},
/**
 * @methodName        submitRent
 * @description       Used to submit the filled rentuser information
 * @param             none
 * @returns           none             
 */
submitRent:function(){
  if(this.data.rentAddressInput.length == 42){
    let Time;
    if(this.data.RentTime.length == 0){Time = '23:59'}else{Time = this.data.RentTime}
    const realTime = this.data.RentDay +'T'+ Time;
    let data = new Date(realTime);
    let time = data.getTime();
    let RentTimeStamp = Math.floor(time/1000);
    console.log(realTime);console.log("时间戳（秒）:", RentTimeStamp);
    if(RentTimeStamp>Math.floor(Date.now() / 1000)){
      let battery;let Trust;
      if(this.data.ifOpenBattery === 'yes'){battery = '1';}
      else{battery = '0'}
      if(this.data.ifTrustRent === 'yes'){Trust = '$';}
      else{Trust = ''}  
      const content = `您将授权 ${this.data.rentAddressInput} 骑行 ${this.data.connectingName} 至 ${this.data.RentDay} ${Time}`;
      wx.showModal({
        title: '提醒',
        content: content,
        complete: (res) => {if (res.confirm) {
            const Command = 'RentAdd'+this.data.rentAddressInput+battery+RentTimeStamp+Trust;
            console.log(Command)
            this.sendsecretUnfixedCommand(Command);
            this.setData({showingRentModal:false})}}
      })}else{
      wx.showToast({ title: '时间不正确',icon:'error', duration:1000})
    } }else{wx.showToast({title: '不是标准的钱包地址',icon:'error',duration:1000})
  }
},
//exit the rent modal
ExitRent:function(){
  this.setData({showingRentModal:false})
},
//Interface for filling in and displaying mobile phone number and social account information
backToWallet:function(){
  this.setData({ifShowUserInfo:false})
},backToPAW:function(){
  this.setData({showChangePAW:false,Phone:'',chat:''})
},ChangePhoneAndChat:function(){
  this.setData({showChangePAW:true})
},PhoneCHangeInput:function(e){
  this.setData({Phone:e.detail.value})
},
/**
 * @methodName        chooseAWechatImage
 * @description       Call the window to select a business card QR code
 * @param             none
 * @returns           none  
 * @see               decodeQRCodeFromImage     Analysis           
 */
chooseAWechatImage:function(){
  wx.chooseMedia({
    count:1,mediaType:['image'],sourceType:['album', 'camera'],
    success:(res)=>{
      const tempFilePath = res.tempFiles[0].tempFilePath;
      this.decodeQRCodeFromImage(tempFilePath);
    },
  })
},
/**
 * @methodName        decodeQRCodeFromImage
 * @description       Parse the transmitted QR code path
 * @param             filePath    The QR code path just now
 * @returns           none  
 * @note              The jsQR library only supports traditional black bar QR codes       
 */
decodeQRCodeFromImage:function(filePath) {
  wx.getImageInfo({
    src: filePath,
    success: (res) => {
      const canvas = wx.createCanvasContext('myCanvas');
      canvas.drawImage(res.path, 0, 0, res.width, res.height);
      canvas.draw(false, () => {
        wx.canvasGetImageData({
          canvasId: 'myCanvas',x: 0,y: 0,width: res.width,height: res.height,
          success: (imageData) => {
            const code = jsQR(new Uint8ClampedArray(imageData.data.buffer), res.width, res.height);
            if (code) {
              console.log(code.data)
              this.setData({chat:code.data}); 
            } else {wx.showToast({title: '格式错误',icon:'error',duration:1000})}
          },
          fail: () => {wx.showToast({title: '图片读取失败',icon:'error',duration:1000})}
        });
      });
    },fail: () => {wx.showToast({title: '选取失败',icon:'error',duration:1000}) }
  });
},
/**
 * @methodName        SubmitChangePAW
 * @description       Modify the input data to the page to facilitate updating to the device
 * @param             none
 * @returns           none  
 * @note              Update information will be automatically sent after the update     
 */
SubmitChangePAW:function(){
  if(this.data.Phone.length === 11){
    const content = `电话:${this.data.Phone}`
    wx.showModal({
      title: '请确认',
      content: content,
      confirmText:'确认无误',
      complete: (res) => {
        if (res.confirm) {
          this.setData({UsingDevicePhone:this.data.Phone,UsingDeviceChat:this.data.chat})
          wx.showToast({title: '修改成功',icon:'success',duration:1000})
          console.log(this.data.UsingDevicePhone);console.log(this.data.UsingDeviceChat)
          wx.setStorageSync('UsingDevicePhone', this.data.UsingDevicePhone);
          wx.setStorageSync('UsingDeviceChat', this.data.UsingDeviceChat)
        }
      }
    })
  }else{wx.showToast({title: '错误的电话格式',icon:'error',duration:1000 })}
},
//Opening, closing and inputting the transfer interface
showTransferDevice:function(){
  this.setData({showTransferDevice:true})
},transformInput:function(e){
  this.setData({
    transformInput: e.detail.value
  })
},exitTransform:function(){
  this.setData({showTransferDevice:false})
},
/**
 * @methodName        TransformDevicebutton
 * @description       Verify the legitimacy of the transferred equipment
 * @param             none
 * @returns           none  
 * @see               promptPassword    Verify password
 * @note              Non-networked devices, please carefully confirm the accuracy of the input, 
 *                    we are not responsible for any problems    
 */
TransformDevicebutton:function(){
  if(this.data.transformInput.length == 42){
    this.promptPassword();
  }else {
    wx.showToast({title: '地址不和规范',icon:'error',duration:1000})
  }
},
/**
 * @methodName        promptPassword
 * @description       Verify password
 * @param             none
 * @returns           none  
 * @see               verifyPasswordAndExecute    Perform follow-up operations  
 */
promptPassword:function(){
  const that = this;wx.showModal({
    title: '转让需要验证密码',
    editable: true, 
    placeholderText: '请输入密码', 
    success: function (res) {
      if (res.confirm) { const inputpassword = res.content;
        if (inputpassword) {that.verifyPasswordAndExecute(inputpassword);} 
        else {wx.showToast({ title: '密码不能为空', icon: 'error', duration: 1000 });}
      }
    }
  });
},
/**
 * @methodName        verifyPasswordAndExecute
 * @description       Verify password and send change user command
 * @param             inputpassword               Password entered by the user
 * @returns           none  
 * @see               sendsecretUnfixedCommand    send unfixed commamd 
 */
verifyPasswordAndExecute:function(inputpassword){
  console.log(this.data.password)
  if(inputpassword===this.data.password){
    const cmd = 'SuChange'+this.data.transformInput;
    this.sendsecretUnfixedCommand(cmd)
  }else{
    wx.showToast({title: '密码错误',icon:'error',duration:1000})
  }
},
//Go to View My Devices
MyDeviceShow:function(){
  this.setData({showMyDevice:true})
},
//View a specific device
checkThisDevice:function(e){
  const deviceDetail = e.currentTarget.dataset.device;
  if(deviceDetail.name){
    this.sequenceRentUserAgain(deviceDetail);
  }else{
    wx.showToast({title: '发生了错误',icon:'error',duration:1000})
  }  
},
/**
 * @methodName        sequenceRentUserAgain
 * @description       Check if any rent users on this device have expired
 * @param             deviceDetail             A structure that specifies the device
 * @returns           none  
 * @see               checkRentTimeValid       verify if specific user's using time valid 
 */
sequenceRentUserAgain:function(deviceDetail){
  const thisDevice = this.data.myDevice.find(item => item.name === deviceDetail.name)
  if (thisDevice && thisDevice.rentUser){
    const updatedRentUser = thisDevice.rentUser
    .filter(user => {
      const isValid = this.checkRentTimeValid(user.time);
      return isValid;  
    });thisDevice.rentUser = updatedRentUser
    const updatedMyDevice = [...this.data.myDevice];
    const deviceIndex = updatedMyDevice.findIndex(item => item.name === deviceDetail.name);
    if (deviceIndex !== -1) {
       updatedMyDevice[deviceIndex] = thisDevice;  // 直接替换设备对象
    }
    
    this.setData({myDevice:updatedMyDevice,ifList:false,checkingDevice:thisDevice})
    wx.setStorageSync('myDevice', updatedMyDevice);
  }
},
/**
 * @methodName        checkRentTimeValid
 * @description       Check the validity of user time
 * @param             timechar              Time attributes in structures
 * @returns           true                  Legal
 *                    false                 Illegal  
 */
checkRentTimeValid:function(timechar){
  const nowTime = Math.floor(Date.now() / 1000);
  const formattedTime = timechar.replace(/-(?=\d{2}:\d{2}$)/, 'T');
  const rentToTime = Math.floor(new Date(formattedTime).getTime() / 1000);
  if(rentToTime > nowTime){
    return true;
  }else{return false}
},
//Exit from the main device interface
backToWalletFromDevie:function(){
  this.setData({showMyDevice:false})
},
//Exit from the specified device interface
backToDevie:function(){
  this.setData({ifList:true})
},
/**
 * @methodName        ShowDeviceMasterQR
 * @description       Display borrowing interface
 * @param             none
 * @returns           none
 * @see               generateQRCode    Generate a QR code based on the link sent by the device 
 */
ShowDeviceMasterQR:function(){
  this.generateQRCode();
  this.setData({showNeedRentModal:true})
},
/**
 * @methodName        ShowDeviceMasterQR
 * @description       Display borrowing interface
 * @param             none
 * @returns           none
 * @see               generateQRCode    Generate a QR code based on the link sent by the device 
 */
generateQRCode: function() {
  if(this.data.RentDeviceChat){
    const qrCodeString = this.data.RentDeviceChat; // The content of the QR code to be generated
    drawQrcode({
      width: 200,                               
      height: 200,                                
      canvasId: 'myQrcode',              
      text: qrCodeString,                    
      typeNumber: 7,                  // The larger this attribute is, the more detailed the QR code is.（1-40）
      background: '#ffffff', 
      foreground: '#000000' 
    });
    setTimeout(() => {
      wx.canvasToTempFilePath({
        canvasId: 'myQrcode',
        success: (res) => {
          this.setData({qrCodeImagePath: res.tempFilePath});
        },fail:(err)=>{console.log(err)}
      });
    }, 500);
  }else{
    wx.showToast({title: '设备不供出租',icon:'none',duration:1000})
  }
},
//Exit from the loan page
exitBorrrow:function(){
  this.setData({showNeedRentModal:false})
},
//used to show select time limit modal
showSelctTime:function(){
  this.setData({setQrTimeModal:true})
},
//Respond to selected value
onPickerChange: function (e) {
  const selected = this.data.range[e.detail.value];
  this.setData({selectedValue: selected});
},
/**
 * @methodName        generateTiemLimitQRCode
 * @description       Set pre-generation parameters
 * @param             none
 * @returns           none
 * @see               generateAuthorCode    Generate a specific QR code
 */
generateTiemLimitQRCode:function(){
  const uuid = this.data.checkingDevice.uuid;
  const usingTime = Math.floor(Date.now() / 1000);
  const limitTime = this.data.selectedValue;
  const command = 'MC';
  const cmd={
    TimeStamp:usingTime,
    command:command,
    UUID:uuid
  }
  console.log(cmd)
  var cmdstr=JSON.stringify(cmd)
  const signature =  this.data.wallet.signMessageSync(cmdstr);
  const willeGenerateQR = {
    //pubkey,signature,time    only need three 
    p:this.data.wallet.signingKey.publicKey,
    l:limitTime,
    s:signature,
    t:usingTime
  }
  this.generateAuthorCode(willeGenerateQR);
},
/**
 * @methodName        generateAuthorCode
 * @description       Generate a QR code based on the parameters
 * @param             data
 * @returns           none
 * @see               generateAuthorCode    Generate a specific QR code
 */
generateAuthorCode:function(data){
  const qrCodeContent = JSON.stringify(data);
  const canvasId = 'AuthorizationQrcode';
  drawQrcode({
    width: 200,            
    height: 200,              
    canvasId: canvasId,      
    text: qrCodeContent,    
    typeNumber:18,
    background: '#ffffff',  
    foreground: '#000000'    
  });
  setTimeout(() => {
    wx.canvasToTempFilePath({
      canvasId: 'AuthorizationQrcode',
      success: (res) => {
        this.setData({AuthorizationQRcodePath: res.tempFilePath});
        const ctx = wx.createCanvasContext('AuthorizationQrcode', this);
        ctx.clearRect(0, 0, 200, 200);
        ctx.draw();
      },fail:()=>{
        const ctx = wx.createCanvasContext('AuthorizationQrcode', this);
        ctx.clearRect(0, 0, 200, 200);
        ctx.draw();
        wx.showToast({title: '生成失败',icon:'error',duration:1000})
      }
    });
  }, 500);
  this.setData({showGeneratedQR:true})
},
//exit select time modal
exitGenerateQR:function(){
  this.setData({setQrTimeModal:false,selectedValue:3})
},
//exit generate QRcode and reset all relevant values
exitAuthorQRButton:function(){
  this.setData({showGeneratedQR:false,setQrTimeModal:false,AuthorizationQRcodePath:'',selectedValue:3})
},
})