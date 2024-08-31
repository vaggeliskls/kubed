// Importing necessary modules
import { prompt } from "enquirer";

import * as system from ".";

// Function to prompt user for text input
export async function promptText(
  message: string,
  required = true,
  sensitive = false,
  initial = ""
): Promise<string> {
  try {
    // Set input type based on whether input is sensitive or not
    const type = sensitive ? "password" : "input";
    // Prompt user with message and input type
    const response: any = await prompt({
      type: type,
      name: "field",
      message: `${message}`,
      required: required,
      initial: initial,
    });
    // Return user input
    return response.field;
  } catch (e) {
    // Terminate app if error occurs
    return system.terminateApp();
  }
}

// Function to prompt user to continue
export async function promptContinue(message = "Are you sure"): Promise<boolean> {
  try {
    // Prompt user with message and confirm type
    const response: any = await prompt({
      type: "confirm",
      name: "field",
      message: `${message}`,
    });
    // Return user response
    if (!response.field) {
      return system.terminateApp();
    }
    return response.field;
  } catch (e) {
    // Terminate app if error occurs
    return system.terminateApp();
  }
}

// Function to prompt user for choice
export async function promptChoise(
  message: string,
  choices: string[],
  options?: { initial?: string; multiple?: boolean; skip?: boolean }
): Promise<string> {
  try {
    // Prompt user with message and select type
    const response: any = await prompt({
      type: "select",
      name: "field",
      // Set skip option to false if not provided
      skip: options?.skip ?? false,
      message: message,
      // Set initial choice if provided
      initial: choices.findIndex(choise => choise === options?.initial),
      // Map choices to object with name property
      choices: choices.map(val => ({ name: val })),
      // Return selected value
      result(value) {
        return value;
      },
      // Set required and multiple options based on user input
      required: true,
      multiple: options?.multiple ?? false,
    });
    // Return user choice
    return response.field;
  } catch (e) {
    // Terminate app if error occurs
    return system.terminateApp();
  }
}

// Function to prompt user for multiple choices
export async function promptMultipleChoise(message: string, choices: string[]): Promise<string[]> {
  try {
    // Prompt user for choice with multiple option set to true
    const response: any = await promptChoise(message, choices, { multiple: true });
    // If no choice is selected, prompt user again
    return response.length === 0 ? await promptMultipleChoise(message, choices) : response;
  } catch (e) {
    // Terminate app if error occurs
    return system.terminateApp();
  }
}
