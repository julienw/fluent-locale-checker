#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { FluentResource } from "@fluent/bundle";

let onlyCheck = false;
let directory = null;
const DEFAULT_DIRECTORY = "locales";
const DEFAULT_LOCALE = "en-US";

function processArgs() {
  const args = process.argv.slice(2);
  let arg;
  while ((arg = args.pop())) {
    switch (arg) {
      case "--check":
        onlyCheck = true;
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown arg ${arg}`);
        }
        if (!directory) {
          directory = arg;
        }
        break;
    }
  }

  if (!directory) {
    directory = DEFAULT_DIRECTORY;
  }
}

async function getMapOfResourcesInLocale(locale) {
  const sourceStringFiles = await fs.readdir(path.join(directory, locale));

  const sourceStringMap = new Map();
  await Promise.all(
    sourceStringFiles.map(async (sourceFile) => {
      const fileContent = await fs.readFile(
        path.join(directory, DEFAULT_LOCALE, sourceFile),
        { encoding: "utf-8" },
      );
      sourceStringMap.set(sourceFile, new FluentResource(fileContent));
    }),
  );

  return sourceStringMap;
}

function checkLocale(source, current) {
  const errors = [];
  for (const [file, content] of source) {
    const errorsForFile = checkLocaleFile(file, content, current.get(file));
    if (errorsForFile.length) {
      errors.push([file, errorsForFile]);
    }
  }
  return errors;
}

function checkLocaleFile(file, source, current) {
  if (!current) {
    return [`The file ${file} is missing.`];
  }
  const errors = [];

  for (const string of source.body) {
    console.log(string);
  }

  return errors;
}

async function run() {
  processArgs();

  const localeDirs = (await fs.readdir(directory, { withFileTypes: true }))
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name);

  const defautLocaleIndex = localeDirs.indexOf(DEFAULT_LOCALE);
  if (defautLocaleIndex < 0) {
    throw new Error(
      `Could not find ${DEFAULT_LOCALE} in directory ${directory}.`,
    );
  }

  localeDirs.splice(defautLocaleIndex, 1);

  const sourceStringMap = await getMapOfResourcesInLocale(DEFAULT_LOCALE);

  const errors = [];
  for (const localeDir of localeDirs) {
    const stringMap = await getMapOfResourcesInLocale(localeDir);
    const errorsForLocale = checkLocale(sourceStringMap, stringMap);
    if (errorsForLocale.length) {
      errors.push([localeDir, errorsForLocale]);
    }
  }

  if (errors.length) {
    process.exitCode = -1;
    console.error(errors);
  }
}

run();
