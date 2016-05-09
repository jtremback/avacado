// Factory "morphs" into a Pudding class.
// The reasoning is that calling load in each context
// is cumbersome.

(function () {

  var contract_data = {
    abi: [{ "constant": false, "inputs": [{ "name": "channelId", "type": "bytes32" }, { "name": "sequenceNumber", "type": "uint256" }, { "name": "state", "type": "bytes" }, { "name": "signature0", "type": "bytes" }, { "name": "signature1", "type": "bytes" }], "name": "updateState", "outputs": [], "type": "function" }, { "constant": false, "inputs": [{ "name": "hash", "type": "bytes32" }, { "name": "sig", "type": "bytes" }, { "name": "signer", "type": "address" }], "name": "ecverify", "outputs": [{ "name": "b", "type": "bool" }], "type": "function" }, { "constant": false, "inputs": [{ "name": "channelId", "type": "bytes32" }, { "name": "address0", "type": "address" }, { "name": "address1", "type": "address" }, { "name": "state", "type": "bytes" }, { "name": "challengePeriod", "type": "uint256" }, { "name": "signature0", "type": "bytes" }, { "name": "signature1", "type": "bytes" }], "name": "newChannel", "outputs": [], "type": "function" }, { "constant": false, "inputs": [{ "name": "hash", "type": "bytes32" }, { "name": "sig", "type": "bytes" }], "name": "ecrecovery", "outputs": [{ "name": "", "type": "address" }], "type": "function" }, { "constant": false, "inputs": [{ "name": "channelId", "type": "bytes32" }], "name": "tryClose", "outputs": [], "type": "function" }, { "constant": false, "inputs": [{ "name": "channelId", "type": "bytes32" }], "name": "getChannel", "outputs": [{ "name": "address0", "type": "address" }, { "name": "address1", "type": "address" }, { "name": "phase", "type": "uint8" }, { "name": "challengePeriod", "type": "uint256" }, { "name": "closingBlock", "type": "uint256" }, { "name": "state", "type": "bytes" }, { "name": "sequenceNumber", "type": "uint256" }], "type": "function" }, { "constant": false, "inputs": [{ "name": "channelId", "type": "bytes32" }, { "name": "signature", "type": "bytes" }, { "name": "signer", "type": "address" }], "name": "startChallengePeriod", "outputs": [], "type": "function" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "message", "type": "string" }], "name": "Error", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "label", "type": "string" }, { "indexed": false, "name": "message", "type": "string" }], "name": "LogString", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "label", "type": "string" }, { "indexed": false, "name": "message", "type": "bytes" }], "name": "LogBytes", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "label", "type": "string" }, { "indexed": false, "name": "message", "type": "bytes32" }], "name": "LogBytes32", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "num", "type": "uint256" }], "name": "LogNum256", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "num", "type": "uint8" }], "name": "LogNum", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "b", "type": "bool" }], "name": "LogBool", "type": "event" }],
    binary: "6060604052610fa4806100126000396000f3606060405236156100615760e060020a60003504632af3b7f8811461006357806339cdde321461013a5780636d46398b1461019c57806377d32e941461034057806380ef353d146103a7578063831c2b82146104335780639013d1ed146104e1575b005b604080516020604435600481810135601f8101849004840285018401909552848452610061948135946024803595939460649492939101918190840183828082843750506040805160209735808a0135601f81018a90048a0283018a019093528282529698976084979196506024919091019450909250829150840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760a49791965060249190910194509092508291508401838280828437509496505050505050506000610acb866103ae565b60408051602060046024803582810135601f81018590048502860185019096528585526105a1958335959394604494939290920191819084018382808284375094965050933593505050505b600081600160a060020a03166106ee858561038a565b604080516020606435600481810135601f8101849004840285018401909552848452610061948135946024803595604435956084949201919081908401838280828437505060408051602060a435808b0135601f810183900483028401830190945283835297999835989760c4975091955060249190910193509091508190840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760e4979196506024919091019450909250829150840183828082843750949650505050505050604080516101008101825260008082526020828101829052828401829052606083018290526080830182905260a083018290528351808201855282815260c084015260e083018290528a8252819052918220548914156107a957604080516020808252602a908201527f6368616e6e656c20776974682074686174206368616e6e656c496420616c7265818301527f616479206578697374730000000000000000000000000000000000000000000060608201529051600080516020610f848339815191529181900360800190a161079e565b60408051602060046024803582810135601f81018590048502860185019096528585526105b395833595939460449493929092019181908401838280828437509496505050505050505b60006000600060008451604114151561067d575b50505092915050565b6100616004355b60008181526020819052604090206002015460a060020a900460ff1660011480156103e6575060406000908120908290526004015443115b15610430576000818152602081905260409020600201805474ff00000000000000000000000000000000000000001916740200000000000000000000000000000000000000001790555b50565b6105d06004356040805160208181018352600080835284815280825283812060018181015460028381015460038501546004860154600590960180548b519681161561010002600019011693909304601f8101899004890286018901909a52898552600160a060020a03938416999382169860a060020a90920460ff1697909691949193919291908301828280156107655780601f1061073a57610100808354040283529160200191610765565b60408051602060046024803582810135601f81018590048502860185019096528585526100619583359593946044949392909201918190840183828082843750949650509335935050505060008381526020819052604081206002015460a060020a900460ff168114610e09576040805160208082526010908201527f6368616e6e656c206e6f74206f70656e00000000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610e03565b60408051918252519081900360200190f35b60408051600160a060020a03929092168252519081900360200190f35b6040518088600160a060020a0316815260200187600160a060020a031681526020018660ff168152602001858152602001848152602001806020018381526020018281038252848181518152602001915080519060200190808383829060006004602084601f0104600f02600301f150905090810190601f1680156106695780820380516001836020036101000a031916815260200191505b509850505050505050505060405180910390f35b505050602082015160408301516041840151601b60ff8216101561069f57601b015b600186828585604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051808303816000866161da5a03f11561000257505060405151935061039e565b600160a060020a031614905080507fc33356bc2bad2ce263b056da5d061d4e89c336823d5e77f14c1383aedb7a1b3a816040518082815260200191505060405180910390a19392505050565b820191906000526020600020905b81548152906001019060200180831161074857829003601f168201915b50505060008b8152602081905260409020600601549294509192505050919395979092949650565b505060e09190910151600691909101555b505050505050505050565b888888888860405180807f6e65774368616e6e656c00000000000000000000000000000000000000000000815260200150600a0186815260200185600160a060020a03166c0100000000000000000000000002815260140184600160a060020a03166c010000000000000000000000000281526014018380519060200190808383829060006004602084601f0104600f02600301f150905001828152602001955050505050506040518091039020915061086482858a610186565b15156108bd576040805160208082526012908201527f7369676e61747572653020696e76616c69640000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a161079e565b6108c8828489610186565b1515610921576040805160208082526012908201527f7369676e61747572653120696e76616c69640000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a161079e565b610100604051908101604052808a815260200189815260200188815260200160008152602001868152602001600081526020018781526020016000815260200150905080600060005060008b81526020019081526020016000206000506000820151816000016000505560208201518160010160006101000a815481600160a060020a030219169083021790555060408201518160020160006101000a815481600160a060020a030219169083021790555060608201518160020160146101000a81548160ff021916908302179055506080820151816003016000505560a0820151816004016000505560c0820151816005016000509080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10610a7857805160ff19168380011785555b5061078d9291505b80821115610aa85760008155600101610a64565b82800160010185558215610a5c579182015b82811115610a5c578251826000505591602001919060010190610a8a565b5090565b505060008681526020819052604090206006018590555b505050505050565b600086815260208190526040902060029081015460a060020a900460ff161415610b4257604080516020808252600e908201527f6368616e6e656c20636c6f736564000000000000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610ac3565b85858560405180807f7570646174655374617465000000000000000000000000000000000000000000815260200150600b018481526020018381526020018280519060200190808383829060006004602084601f0104600f02600301f150905001935050505060405180910390209050610bec8184600060005060008a815260200190815260200160002060005060010160009054906101000a9004600160a060020a0316610186565b1515610c45576040805160208082526012908201527f7369676e61747572653020696e76616c69640000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610ac3565b600086815260208190526040902060020154610c6d9082908490600160a060020a0316610186565b1515610cc6576040805160208082526012908201527f7369676e61747572653120696e76616c69640000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610ac3565b6000868152602081905260409020600601548511610d31576040805160208082526017908201527f73657175656e6365206e756d62657220746f6f206c6f77000000000000000000818301529051600080516020610f848339815191529181900360600190a1610ac3565b60008681526020818152604082208651600591909101805481855293839020909360026001821615610100026000190190911604601f908101849004820193890190839010610d9357805160ff19168380011785555b50610aac929150610a64565b82800160010185558215610d87579182015b82811115610d87578251826000505591602001919060010190610da5565b6000848152602081905260409020600381015443016004820155600201805474ff0000000000000000000000000000000000000000191660a060020a1790555b50505050565b50604080517f73746172744368616c6c656e6765506572696f640000000000000000000000008152601481018590528151908190036034019020600085815260208190529190912060010154600160a060020a039081169083161415610e8e57604060009081209085905260010154610ed89082908590600160a060020a0316610186565b600084815260208190526040902060020154600160a060020a0383811691161415610f3157604060009081209085905260020154610ed89082908590600160a060020a0316610186565b1515610dc3576040805160208082526011908201527f7369676e617475726520696e76616c6964000000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610e03565b604080516020808252600e908201527f7369676e657220696e76616c6964000000000000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610e035608c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa",
    unlinked_binary: "6060604052610fa4806100126000396000f3606060405236156100615760e060020a60003504632af3b7f8811461006357806339cdde321461013a5780636d46398b1461019c57806377d32e941461034057806380ef353d146103a7578063831c2b82146104335780639013d1ed146104e1575b005b604080516020604435600481810135601f8101849004840285018401909552848452610061948135946024803595939460649492939101918190840183828082843750506040805160209735808a0135601f81018a90048a0283018a019093528282529698976084979196506024919091019450909250829150840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760a49791965060249190910194509092508291508401838280828437509496505050505050506000610acb866103ae565b60408051602060046024803582810135601f81018590048502860185019096528585526105a1958335959394604494939290920191819084018382808284375094965050933593505050505b600081600160a060020a03166106ee858561038a565b604080516020606435600481810135601f8101849004840285018401909552848452610061948135946024803595604435956084949201919081908401838280828437505060408051602060a435808b0135601f810183900483028401830190945283835297999835989760c4975091955060249190910193509091508190840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760e4979196506024919091019450909250829150840183828082843750949650505050505050604080516101008101825260008082526020828101829052828401829052606083018290526080830182905260a083018290528351808201855282815260c084015260e083018290528a8252819052918220548914156107a957604080516020808252602a908201527f6368616e6e656c20776974682074686174206368616e6e656c496420616c7265818301527f616479206578697374730000000000000000000000000000000000000000000060608201529051600080516020610f848339815191529181900360800190a161079e565b60408051602060046024803582810135601f81018590048502860185019096528585526105b395833595939460449493929092019181908401838280828437509496505050505050505b60006000600060008451604114151561067d575b50505092915050565b6100616004355b60008181526020819052604090206002015460a060020a900460ff1660011480156103e6575060406000908120908290526004015443115b15610430576000818152602081905260409020600201805474ff00000000000000000000000000000000000000001916740200000000000000000000000000000000000000001790555b50565b6105d06004356040805160208181018352600080835284815280825283812060018181015460028381015460038501546004860154600590960180548b519681161561010002600019011693909304601f8101899004890286018901909a52898552600160a060020a03938416999382169860a060020a90920460ff1697909691949193919291908301828280156107655780601f1061073a57610100808354040283529160200191610765565b60408051602060046024803582810135601f81018590048502860185019096528585526100619583359593946044949392909201918190840183828082843750949650509335935050505060008381526020819052604081206002015460a060020a900460ff168114610e09576040805160208082526010908201527f6368616e6e656c206e6f74206f70656e00000000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610e03565b60408051918252519081900360200190f35b60408051600160a060020a03929092168252519081900360200190f35b6040518088600160a060020a0316815260200187600160a060020a031681526020018660ff168152602001858152602001848152602001806020018381526020018281038252848181518152602001915080519060200190808383829060006004602084601f0104600f02600301f150905090810190601f1680156106695780820380516001836020036101000a031916815260200191505b509850505050505050505060405180910390f35b505050602082015160408301516041840151601b60ff8216101561069f57601b015b600186828585604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051808303816000866161da5a03f11561000257505060405151935061039e565b600160a060020a031614905080507fc33356bc2bad2ce263b056da5d061d4e89c336823d5e77f14c1383aedb7a1b3a816040518082815260200191505060405180910390a19392505050565b820191906000526020600020905b81548152906001019060200180831161074857829003601f168201915b50505060008b8152602081905260409020600601549294509192505050919395979092949650565b505060e09190910151600691909101555b505050505050505050565b888888888860405180807f6e65774368616e6e656c00000000000000000000000000000000000000000000815260200150600a0186815260200185600160a060020a03166c0100000000000000000000000002815260140184600160a060020a03166c010000000000000000000000000281526014018380519060200190808383829060006004602084601f0104600f02600301f150905001828152602001955050505050506040518091039020915061086482858a610186565b15156108bd576040805160208082526012908201527f7369676e61747572653020696e76616c69640000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a161079e565b6108c8828489610186565b1515610921576040805160208082526012908201527f7369676e61747572653120696e76616c69640000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a161079e565b610100604051908101604052808a815260200189815260200188815260200160008152602001868152602001600081526020018781526020016000815260200150905080600060005060008b81526020019081526020016000206000506000820151816000016000505560208201518160010160006101000a815481600160a060020a030219169083021790555060408201518160020160006101000a815481600160a060020a030219169083021790555060608201518160020160146101000a81548160ff021916908302179055506080820151816003016000505560a0820151816004016000505560c0820151816005016000509080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10610a7857805160ff19168380011785555b5061078d9291505b80821115610aa85760008155600101610a64565b82800160010185558215610a5c579182015b82811115610a5c578251826000505591602001919060010190610a8a565b5090565b505060008681526020819052604090206006018590555b505050505050565b600086815260208190526040902060029081015460a060020a900460ff161415610b4257604080516020808252600e908201527f6368616e6e656c20636c6f736564000000000000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610ac3565b85858560405180807f7570646174655374617465000000000000000000000000000000000000000000815260200150600b018481526020018381526020018280519060200190808383829060006004602084601f0104600f02600301f150905001935050505060405180910390209050610bec8184600060005060008a815260200190815260200160002060005060010160009054906101000a9004600160a060020a0316610186565b1515610c45576040805160208082526012908201527f7369676e61747572653020696e76616c69640000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610ac3565b600086815260208190526040902060020154610c6d9082908490600160a060020a0316610186565b1515610cc6576040805160208082526012908201527f7369676e61747572653120696e76616c69640000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610ac3565b6000868152602081905260409020600601548511610d31576040805160208082526017908201527f73657175656e6365206e756d62657220746f6f206c6f77000000000000000000818301529051600080516020610f848339815191529181900360600190a1610ac3565b60008681526020818152604082208651600591909101805481855293839020909360026001821615610100026000190190911604601f908101849004820193890190839010610d9357805160ff19168380011785555b50610aac929150610a64565b82800160010185558215610d87579182015b82811115610d87578251826000505591602001919060010190610da5565b6000848152602081905260409020600381015443016004820155600201805474ff0000000000000000000000000000000000000000191660a060020a1790555b50505050565b50604080517f73746172744368616c6c656e6765506572696f640000000000000000000000008152601481018590528151908190036034019020600085815260208190529190912060010154600160a060020a039081169083161415610e8e57604060009081209085905260010154610ed89082908590600160a060020a0316610186565b600084815260208190526040902060020154600160a060020a0383811691161415610f3157604060009081209085905260020154610ed89082908590600160a060020a0316610186565b1515610dc3576040805160208082526011908201527f7369676e617475726520696e76616c6964000000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610e03565b604080516020808252600e908201527f7369676e657220696e76616c6964000000000000000000000000000000000000818301529051600080516020610f848339815191529181900360600190a1610e035608c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa",
    address: "0x7a7c24dc47afc31491e2df97e283938ee171b6af",
    generated_with: "2.0.6",
    contract_name: "StateChannels"
  };

  function Contract() {
    if (Contract.Pudding == null) {
      throw new Error("StateChannels error: Please call load() first before creating new instance of this contract.");
    }

    Contract.Pudding.apply(this, arguments);
  };

  Contract.load = function (Pudding) {
    Contract.Pudding = Pudding;

    Pudding.whisk(contract_data, Contract);

    // Return itself for backwards compatibility.
    return Contract;
  }

  Contract.new = function () {
    if (Contract.Pudding == null) {
      throw new Error("StateChannels error: Please call load() first before calling new().");
    }

    return Contract.Pudding.new.apply(Contract, arguments);
  };

  Contract.at = function () {
    if (Contract.Pudding == null) {
      throw new Error("StateChannels error: lease call load() first before calling at().");
    }

    return Contract.Pudding.at.apply(Contract, arguments);
  };

  Contract.deployed = function () {
    if (Contract.Pudding == null) {
      throw new Error("StateChannels error: Please call load() first before calling deployed().");
    }

    return Contract.Pudding.deployed.apply(Contract, arguments);
  };

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of Pudding in the browser,
    // and we can use that.
    window.StateChannels = Contract;
  }

})();
