import {
  reactExtension,
  Banner,
  BlockStack,
  Checkbox,
  Text,
  Button,
  Choice,
  ChoiceList,
  useApi,
  useApplyAttributeChange,
  useTranslate
} from "@shopify/ui-extensions-react/checkout";
import React, { useState } from 'react';

// 1. Choose an extension target
export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

function Extension() {
  const translate = useTranslate();
  const { extension } = useApi();
  const applyAttributeChange = useApplyAttributeChange();

  const { lines, buyerIdentity } = useApi();

  const [selectedProducts, setProducts] = useState([]);

  const addProducts = (selected) => {
    setProducts(selected);
  }

  const saveCart = async () => {
    const url = `${process.env.APP_URL}/api/save` ;
    
    const cartArray = selectedProducts.map((prodId) => {
      const productLine = lines.current.find((p) => p.merchandise.id === prodId);
      return productLine ? {id: prodId, quantity: productLine.quantity} : null;
    }).filter(Boolean);
    console.log(cartArray);
    
    const data = {
      customerId: buyerIdentity.customer.current.id,
      cart: cartArray
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Response from backend:", result);
      } else {
        console.error("Failed to send data", response.status);
      }
      
    } catch (err) {
      console.log(err);
    }

  }
  
  // 3. Render a UI
  return (
    <BlockStack border={"dotted"} padding={"tight"}>
      <ChoiceList
        name="save-products-list"
        onChange={(value) => addProducts(value)}
        variant="group"
        value={selectedProducts}
      >
        {lines.current.map((line, i) => {
          //console.log(line);
          return (
            <Choice key={i + 1} id={line.merchandise.id}>{line.merchandise.title}</Choice>
          )
        })}

      </ChoiceList>
      <Button
        onPress={() => {
          console.log('onPress event');
          saveCart();
        }}
      >
        Save Cart
      </Button>

      {/* <Checkbox onChange={onCheckboxChange}>
        {translate("iWouldLikeAFreeGiftWithMyOrder")}
      </Checkbox> */}
    </BlockStack>
  );

  async function onCheckboxChange(isChecked) {
    // 4. Call the API to modify checkout
    const result = await applyAttributeChange({
      key: "requestedFreeGift",
      type: "updateAttribute",
      value: isChecked ? "yes" : "no",
    });
    console.log("applyAttributeChange result", result);
  }
}