const e = require('./elements');
const ule = require('../user/elements');
const { ELEMENT_WAIT_TIME } = require('../core/constants');

async function openChat(test) {
  await test.waitForSelector(e.chatBox, ELEMENT_WAIT_TIME);
  await test.waitForSelector(e.chatMessages, ELEMENT_WAIT_TIME);
}

async function sendPublicChatMessage(page1, page2) {
  // send a public message
  await page1.page.type(e.publicChat, e.publicMessage1);
  await page1.page.click(e.sendButton, true);
  await page1.page.screenshot(true);
  await page2.page.type(e.publicChat, e.publicMessage2);
  await page2.page.click(e.sendButton, true);
  await page2.page.screenshot(true);
}

async function openPrivateChatMessage(page1, page2) {
  // Open private Chat with the other User
  Object.values(arguments).forEach(async argument => await argument.waitForSelector(ule.userListItem, ELEMENT_WAIT_TIME));
  await page1.page.evaluate(clickOnTheOtherUser, ule.userListItem);
  await page2.page.evaluate(clickOnTheOtherUser, ule.userListItem);
  await page1.page.waitForSelector(e.activeChat, ELEMENT_WAIT_TIME);
  await page1.page.evaluate(clickThePrivateChatButton, e.activeChat);
  await page2.page.waitForSelector(e.activeChat, ELEMENT_WAIT_TIME);
  await page2.page.evaluate(clickThePrivateChatButton, e.activeChat);
}

async function sendPrivateChatMessage(page1, page2) {
  // send a private message
  await page1.page.$$('[aria-label="Hide Private Chat with User2]');
  await page2.page.$$('[aria-label="Hide Private Chat with User1]');

  await page1.page.type(e.privateChat, e.message1);
  await page1.page.click(e.sendButton, true);
  await page1.page.screenshot(true);
  await page2.page.type(e.privateChat, e.message2);
  await page2.page.click(e.sendButton, true);
  await page2.page.screenshot(true);
}

async function clickOnTheOtherUser(element) {
  await document.querySelectorAll(element)[0].click();
}

async function clickThePrivateChatButton(element) {
  await document.querySelectorAll(element)[0].click();
}

async function checkForPublicMessageReception(page1, page2) {
  const publicChat1 = await page1.page.$$(`${e.chatUserMessage} ${e.chatMessageText}`);
  const publicChat2 = await page2.page.$$(`${e.chatUserMessage} ${e.chatMessageText}`);

  const checkPublicMessage1 = await publicChat1[0].evaluate(n => n.innerText);
  const checkPublicMessage2 = await publicChat2[1].evaluate(n => n.innerText);

  const response = checkPublicMessage1 == e.publicMessage1 && checkPublicMessage2 == e.publicMessage2;
  return response;
}

async function checkForPrivateMessageReception(page1, page2) {
  const privateChat1 = await page1.page.$$(`${e.chatUserMessage} ${e.chatMessageText}`);
  const privateChat2 = await page2.page.$$(`${e.chatUserMessage} ${e.chatMessageText}`);

  const checkPrivateMessage1 = await privateChat1[0].evaluate(n => n.innerText);
  const checkPrivateMessage2 = await privateChat2[1].evaluate(n => n.innerText);

  const response = checkPrivateMessage1 == e.message1 && checkPrivateMessage2 == e.message2;
  return response;
}

async function getTestElements(test) {
  const messages = await test.page.$$(`${e.chatUserMessage} ${e.chatMessageText}`);
  return messages;
}

exports.openChat = openChat;
exports.getTestElements = getTestElements;
exports.openPrivateChatMessage = openPrivateChatMessage;
exports.sendPrivateChatMessage = sendPrivateChatMessage;
exports.checkForPublicMessageReception = checkForPublicMessageReception;
exports.checkForPrivateMessageReception = checkForPrivateMessageReception;
exports.sendPublicChatMessage = sendPublicChatMessage;
