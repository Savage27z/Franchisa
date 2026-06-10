#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(not(any(test, feature = "export-abi")))]
#[no_mangle]
pub extern "C" fn main() {}

#[cfg(feature = "export-abi")]
fn main() {
    stylus_sdk::abi::export::print_abi::<franchisa_proxy_oracle::ProxyOracle>(
        "MIT",
        "pragma solidity ^0.8.23;",
    );
}
