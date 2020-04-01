# Azure Event Grid Node Demo

Simple NodeJS web app used for Event Grid and Serverless demo.

This code assumes you have deployed and configured the demo code (Azure Functions and Azure Logic Apps) contained in the [MOD30 module](https://github.com/sjwaight/ignite-learning-paths-training-mod/blob/master/mod30/setup.md) from Ignite the Tour.

In order to get this code working you will need the Azure Storage Account name and an Account Key which you can configure as environment variables that are read by the node web server at runtime.

If you deploy this Node application to Azure App Service (which you should!) then you can define the variables as Application settings under Configuration.

Learn more about:

- [Azure Event Grid](https://docs.microsoft.com/azure/event-grid/).
- [Azure Functions](https://docs.microsoft.com/azure/azure-functions/).
- [Azure Logic Apps](https://docs.microsoft.com/azure/logic-apps/).