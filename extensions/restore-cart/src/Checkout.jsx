import {
  reactExtension,
  BlockStack,
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
  if(buyerIdentity.customer.current == undefined) {
    return (
      <BlockStack border={"dotted"} padding={"tight"}>
        <Text>Please login or register to save your cart</Text>
      </BlockStack>
    );
  }
  const [selectedProducts, setProducts] = useState([]);
  const [msg, setMessage] = useState('');

  const addProducts = (selected) => {
    setMessage('');
    setProducts(selected);
  }

  const saveCart = async () => {
    const url = `${process.env.APP_URL}/api/save` ;
    
    if(selectedProducts.length === 0) {
        setMessage('Please select products to save');
        return;
    }
    const cartArray = selectedProducts.map((prodId) => {
      const productLine = lines.current.find((p) => p.merchandise.id === prodId);
      return productLine ? {id: prodId, quantity: productLine.quantity} : null;
    }).filter(Boolean);
    
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
        setMessage('Cart saved successfully!');
        setTimeout(() => setMessage(''), 3000);
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
      <Text size="large">Save your cart</Text>
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
      <Button onPress={() => {saveCart();}}>
        Save Cart
      </Button>
      
      <Text>{msg}</Text>
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