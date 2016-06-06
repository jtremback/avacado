var Web3 = require("web3");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  return accept(tx, receipt);
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                attempts += 1;

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("Contract error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.binary) {
      throw new Error("Contract error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("Contract contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of Contract: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to Contract.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: Contract not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": false,
        "inputs": [
          {
            "name": "channelId",
            "type": "bytes32"
          },
          {
            "name": "sequenceNumber",
            "type": "uint256"
          },
          {
            "name": "state",
            "type": "bytes"
          },
          {
            "name": "signature0",
            "type": "bytes"
          },
          {
            "name": "signature1",
            "type": "bytes"
          }
        ],
        "name": "updateState",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "hash",
            "type": "bytes32"
          },
          {
            "name": "sig",
            "type": "bytes"
          },
          {
            "name": "signer",
            "type": "address"
          }
        ],
        "name": "ecverify",
        "outputs": [
          {
            "name": "b",
            "type": "bool"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "channelId",
            "type": "bytes32"
          },
          {
            "name": "address0",
            "type": "address"
          },
          {
            "name": "address1",
            "type": "address"
          },
          {
            "name": "state",
            "type": "bytes"
          },
          {
            "name": "challengePeriod",
            "type": "uint256"
          },
          {
            "name": "signature0",
            "type": "bytes"
          },
          {
            "name": "signature1",
            "type": "bytes"
          }
        ],
        "name": "newChannel",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "hash",
            "type": "bytes32"
          },
          {
            "name": "sig",
            "type": "bytes"
          }
        ],
        "name": "ecrecovery",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "channelId",
            "type": "bytes32"
          }
        ],
        "name": "tryClose",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "channelId",
            "type": "bytes32"
          }
        ],
        "name": "getChannel",
        "outputs": [
          {
            "name": "address0",
            "type": "address"
          },
          {
            "name": "address1",
            "type": "address"
          },
          {
            "name": "phase",
            "type": "uint8"
          },
          {
            "name": "challengePeriod",
            "type": "uint256"
          },
          {
            "name": "closingBlock",
            "type": "uint256"
          },
          {
            "name": "state",
            "type": "bytes"
          },
          {
            "name": "sequenceNumber",
            "type": "uint256"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "channelId",
            "type": "bytes32"
          },
          {
            "name": "signature",
            "type": "bytes"
          },
          {
            "name": "signer",
            "type": "address"
          }
        ],
        "name": "startChallengePeriod",
        "outputs": [],
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "Error",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "label",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "LogString",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "label",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "bytes"
          }
        ],
        "name": "LogBytes",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "label",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "bytes32"
          }
        ],
        "name": "LogBytes32",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "num",
            "type": "uint256"
          }
        ],
        "name": "LogNum256",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "num",
            "type": "uint8"
          }
        ],
        "name": "LogNum",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "b",
            "type": "bool"
          }
        ],
        "name": "LogBool",
        "type": "event"
      }
    ],
    "updated_at": 1465170422792,
    "binary": "6060604052610fb8806100126000396000f3606060405236156100615760e060020a60003504632af3b7f8811461006357806339cdde321461013a5780636d46398b1461019c57806377d32e941461034057806380ef353d146103a7578063831c2b82146104335780639013d1ed146104e1575b005b604080516020604435600481810135601f8101849004840285018401909552848452610061948135946024803595939460649492939101918190840183828082843750506040805160209735808a0135601f81018a90048a0283018a019093528282529698976084979196506024919091019450909250829150840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760a4979196506024919091019450909250829150840183828082843750949650505050505050600061069e866103ae565b60408051602060046024803582810135601f81018590048502860185019096528585526105a1958335959394604494939290920191819084018382808284375094965050933593505050505b600081600160a060020a03166109b2858561038a565b604080516020606435600481810135601f8101849004840285018401909552848452610061948135946024803595604435956084949201919081908401838280828437505060408051602060a435808b0135601f810183900483028401830190945283835297999835989760c4975091955060249190910193509091508190840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760e4979196506024919091019450909250829150840183828082843750949650505050505050604080516101008101825260008082526020828101829052828401829052606083018290526080830182905260a083018290528351808201855282815260c084015260e083018290528a825281905291822054891415610a1c57604080516020808252602a908201527f6368616e6e656c20776974682074686174206368616e6e656c496420616c7265818301527f616479206578697374730000000000000000000000000000000000000000000060608201529051600080516020610f988339815191529181900360800190a1610a11565b60408051602060046024803582810135601f81018590048502860185019096528585526105b595833595939460449493929092019181908401838280828437509496505050505050505b600060006000600084516041141515610d13575b50505092915050565b6100616004355b60008181526020819052604090206002015460a060020a900460ff1660011480156103e6575060406000908120908290526004015443115b15610430576000818152602081905260409020600201805474ff00000000000000000000000000000000000000001916740200000000000000000000000000000000000000001790555b50565b6105d26004356040805160208181018352600080835284815280825283812060018181015460028381015460038501546004860154600590960180548b519681161561010002600019011693909304601f8101899004890286018901909a52898552600160a060020a03938416999382169860a060020a90920460ff169790969194919391929190830182828015610daf5780601f10610d8457610100808354040283529160200191610daf565b60408051602060046024803582810135601f81018590048502860185019096528585526100619583359593946044949392909201918190840183828082843750949650509335935050505060008381526020819052604081206002015460a060020a900460ff168114610e1d576040805160208082526010908201527f6368616e6e656c206e6f74206f70656e00000000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610e17565b604080519115158252519081900360200190f35b60408051600160a060020a03929092168252519081900360200190f35b6040518088600160a060020a0316815260200187600160a060020a031681526020018660ff168152602001858152602001848152602001806020018381526020018281038252848181518152602001915080519060200190808383829060006004602084601f0104600f02600301f150905090810190601f16801561066b5780820380516001836020036101000a031916815260200191505b509850505050505050505060405180910390f35b505060008681526020819052604090206006018590555b505050505050565b600086815260208190526040902060029081015460a060020a900460ff16141561071557604080516020808252600e908201527f6368616e6e656c20636c6f736564000000000000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610696565b85858560405180807f7570646174655374617465000000000000000000000000000000000000000000815260200150600b01846000191681526020018381526020018280519060200190808383829060006004602084601f0104600f02600301f1509050019350505050604051809103902090506107c78184600060005060008a60001916815260200190815260200160002060005060010160009054906101000a9004600160a060020a0316610186565b1515610820576040805160208082526012908201527f7369676e61747572653020696e76616c69640000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610696565b6000868152602081905260409020600201546108489082908490600160a060020a0316610186565b15156108a1576040805160208082526012908201527f7369676e61747572653120696e76616c69640000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610696565b600086815260208190526040902060060154851161090c576040805160208082526017908201527f73657175656e6365206e756d62657220746f6f206c6f77000000000000000000818301529051600080516020610f988339815191529181900360600190a1610696565b60008681526020818152604082208651600591909101805481855293839020909360026001821615610100026000190190911604601f90810184900482019389019083901061097e57805160ff19168380011785555b5061067f9291505b808211156109ae576000815560010161096a565b82800160010185558215610962579182015b82811115610962578251826000505591602001919060010190610990565b5090565b600160a060020a031614905080507fc33356bc2bad2ce263b056da5d061d4e89c336823d5e77f14c1383aedb7a1b3a8160405180821515815260200191505060405180910390a19392505050565b505060e09190910151600691909101555b505050505050505050565b888888888860405180807f6e65774368616e6e656c00000000000000000000000000000000000000000000815260200150600a018660001916815260200185600160a060020a03166c0100000000000000000000000002815260140184600160a060020a03166c010000000000000000000000000281526014018380519060200190808383829060006004602084601f0104600f02600301f1509050018281526020019550505050505060405180910390209150610adb82858a610186565b1515610b34576040805160208082526012908201527f7369676e61747572653020696e76616c69640000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610a11565b610b3f828489610186565b1515610b98576040805160208082526012908201527f7369676e61747572653120696e76616c69640000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610a11565b610100604051908101604052808a815260200189815260200188815260200160008152602001868152602001600081526020018781526020016000815260200150905080600060005060008b6000191681526020019081526020016000206000506000820151816000016000505560208201518160010160006101000a815481600160a060020a030219169083021790555060408201518160020160006101000a815481600160a060020a030219169083021790555060608201518160020160146101000a81548160ff021916908302179055506080820151816003016000505560a0820151816004016000505560c0820151816005016000509080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10610ce357805160ff19168380011785555b50610a0092915061096a565b82800160010185558215610cd7579182015b82811115610cd7578251826000505591602001919060010190610cf5565b505050602082015160408301516041840151601b60ff82161015610d3557601b015b6040805187815260ff831660208281019190915281830186905260608201859052915160019260808381019391929182900301816000866161da5a03f11561000257505060405151935061039e565b820191906000526020600020905b815481529060010190602001808311610d9257829003601f168201915b50505060008b8152602081905260409020600601549294509192505050919395979092949650565b6000848152602081905260409020600381015443016004820155600201805474ff0000000000000000000000000000000000000000191660a060020a1790555b50505050565b50604080517f73746172744368616c6c656e6765506572696f640000000000000000000000008152601481018590528151908190036034019020600085815260208190529190912060010154600160a060020a039081169083161415610ea257604060009081209085905260010154610eec9082908590600160a060020a0316610186565b600084815260208190526040902060020154600160a060020a0383811691161415610f4557604060009081209085905260020154610eec9082908590600160a060020a0316610186565b1515610dd7576040805160208082526011908201527f7369676e617475726520696e76616c6964000000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610e17565b604080516020808252600e908201527f7369676e657220696e76616c6964000000000000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610e175608c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa",
    "unlinked_binary": "6060604052610fb8806100126000396000f3606060405236156100615760e060020a60003504632af3b7f8811461006357806339cdde321461013a5780636d46398b1461019c57806377d32e941461034057806380ef353d146103a7578063831c2b82146104335780639013d1ed146104e1575b005b604080516020604435600481810135601f8101849004840285018401909552848452610061948135946024803595939460649492939101918190840183828082843750506040805160209735808a0135601f81018a90048a0283018a019093528282529698976084979196506024919091019450909250829150840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760a4979196506024919091019450909250829150840183828082843750949650505050505050600061069e866103ae565b60408051602060046024803582810135601f81018590048502860185019096528585526105a1958335959394604494939290920191819084018382808284375094965050933593505050505b600081600160a060020a03166109b2858561038a565b604080516020606435600481810135601f8101849004840285018401909552848452610061948135946024803595604435956084949201919081908401838280828437505060408051602060a435808b0135601f810183900483028401830190945283835297999835989760c4975091955060249190910193509091508190840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760e4979196506024919091019450909250829150840183828082843750949650505050505050604080516101008101825260008082526020828101829052828401829052606083018290526080830182905260a083018290528351808201855282815260c084015260e083018290528a825281905291822054891415610a1c57604080516020808252602a908201527f6368616e6e656c20776974682074686174206368616e6e656c496420616c7265818301527f616479206578697374730000000000000000000000000000000000000000000060608201529051600080516020610f988339815191529181900360800190a1610a11565b60408051602060046024803582810135601f81018590048502860185019096528585526105b595833595939460449493929092019181908401838280828437509496505050505050505b600060006000600084516041141515610d13575b50505092915050565b6100616004355b60008181526020819052604090206002015460a060020a900460ff1660011480156103e6575060406000908120908290526004015443115b15610430576000818152602081905260409020600201805474ff00000000000000000000000000000000000000001916740200000000000000000000000000000000000000001790555b50565b6105d26004356040805160208181018352600080835284815280825283812060018181015460028381015460038501546004860154600590960180548b519681161561010002600019011693909304601f8101899004890286018901909a52898552600160a060020a03938416999382169860a060020a90920460ff169790969194919391929190830182828015610daf5780601f10610d8457610100808354040283529160200191610daf565b60408051602060046024803582810135601f81018590048502860185019096528585526100619583359593946044949392909201918190840183828082843750949650509335935050505060008381526020819052604081206002015460a060020a900460ff168114610e1d576040805160208082526010908201527f6368616e6e656c206e6f74206f70656e00000000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610e17565b604080519115158252519081900360200190f35b60408051600160a060020a03929092168252519081900360200190f35b6040518088600160a060020a0316815260200187600160a060020a031681526020018660ff168152602001858152602001848152602001806020018381526020018281038252848181518152602001915080519060200190808383829060006004602084601f0104600f02600301f150905090810190601f16801561066b5780820380516001836020036101000a031916815260200191505b509850505050505050505060405180910390f35b505060008681526020819052604090206006018590555b505050505050565b600086815260208190526040902060029081015460a060020a900460ff16141561071557604080516020808252600e908201527f6368616e6e656c20636c6f736564000000000000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610696565b85858560405180807f7570646174655374617465000000000000000000000000000000000000000000815260200150600b01846000191681526020018381526020018280519060200190808383829060006004602084601f0104600f02600301f1509050019350505050604051809103902090506107c78184600060005060008a60001916815260200190815260200160002060005060010160009054906101000a9004600160a060020a0316610186565b1515610820576040805160208082526012908201527f7369676e61747572653020696e76616c69640000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610696565b6000868152602081905260409020600201546108489082908490600160a060020a0316610186565b15156108a1576040805160208082526012908201527f7369676e61747572653120696e76616c69640000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610696565b600086815260208190526040902060060154851161090c576040805160208082526017908201527f73657175656e6365206e756d62657220746f6f206c6f77000000000000000000818301529051600080516020610f988339815191529181900360600190a1610696565b60008681526020818152604082208651600591909101805481855293839020909360026001821615610100026000190190911604601f90810184900482019389019083901061097e57805160ff19168380011785555b5061067f9291505b808211156109ae576000815560010161096a565b82800160010185558215610962579182015b82811115610962578251826000505591602001919060010190610990565b5090565b600160a060020a031614905080507fc33356bc2bad2ce263b056da5d061d4e89c336823d5e77f14c1383aedb7a1b3a8160405180821515815260200191505060405180910390a19392505050565b505060e09190910151600691909101555b505050505050505050565b888888888860405180807f6e65774368616e6e656c00000000000000000000000000000000000000000000815260200150600a018660001916815260200185600160a060020a03166c0100000000000000000000000002815260140184600160a060020a03166c010000000000000000000000000281526014018380519060200190808383829060006004602084601f0104600f02600301f1509050018281526020019550505050505060405180910390209150610adb82858a610186565b1515610b34576040805160208082526012908201527f7369676e61747572653020696e76616c69640000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610a11565b610b3f828489610186565b1515610b98576040805160208082526012908201527f7369676e61747572653120696e76616c69640000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610a11565b610100604051908101604052808a815260200189815260200188815260200160008152602001868152602001600081526020018781526020016000815260200150905080600060005060008b6000191681526020019081526020016000206000506000820151816000016000505560208201518160010160006101000a815481600160a060020a030219169083021790555060408201518160020160006101000a815481600160a060020a030219169083021790555060608201518160020160146101000a81548160ff021916908302179055506080820151816003016000505560a0820151816004016000505560c0820151816005016000509080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10610ce357805160ff19168380011785555b50610a0092915061096a565b82800160010185558215610cd7579182015b82811115610cd7578251826000505591602001919060010190610cf5565b505050602082015160408301516041840151601b60ff82161015610d3557601b015b6040805187815260ff831660208281019190915281830186905260608201859052915160019260808381019391929182900301816000866161da5a03f11561000257505060405151935061039e565b820191906000526020600020905b815481529060010190602001808311610d9257829003601f168201915b50505060008b8152602081905260409020600601549294509192505050919395979092949650565b6000848152602081905260409020600381015443016004820155600201805474ff0000000000000000000000000000000000000000191660a060020a1790555b50505050565b50604080517f73746172744368616c6c656e6765506572696f640000000000000000000000008152601481018590528151908190036034019020600085815260208190529190912060010154600160a060020a039081169083161415610ea257604060009081209085905260010154610eec9082908590600160a060020a0316610186565b600084815260208190526040902060020154600160a060020a0383811691161415610f4557604060009081209085905260020154610eec9082908590600160a060020a0316610186565b1515610dd7576040805160208082526011908201527f7369676e617475726520696e76616c6964000000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610e17565b604080516020808252600e908201527f7369676e657220696e76616c6964000000000000000000000000000000000000818301529051600080516020610f988339815191529181900360600190a1610e175608c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.binary          = this.prototype.binary          = network.binary;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;

    if (this.unlinked_binary == null || this.unlinked_binary == "") {
      this.unlinked_binary = this.prototype.unlinked_binary = this.binary;
    }

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "Contract";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.0.3";

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.Contract = Contract;
  }
})();