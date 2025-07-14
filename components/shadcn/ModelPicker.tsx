"use client";
import { } from "@radix-ui/react-select";
import type { FC } from "react";
import Anthropic from "@/assets/providers/anthropic.svg";
import Fireworks from "@/assets/providers/fireworks.svg";
import Google from "@/assets/providers/google.svg";
import Deepseek from "@/assets/providers/deepseek.svg";
import Meta from "@/assets/providers/meta.svg";
import Mistral from "@/assets/providers/mistral.svg";
import OpenAI from "@/assets/providers/openai.svg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const models = [
  {
    name: "GPT 4o-mini",
    value: "gpt-4o-mini",
    icon: OpenAI,
  },
  {
    name: "Deepseek R1",
    value: "deepseek-r1",
    icon: Deepseek,
  },
  {
    name: "Claude 3.5 Sonnet",
    value: "claude-3.5-sonnet",
    icon: Anthropic,
  },
  {
    name: "Gemini 2.0 Flash",
    value: "gemini-2.0-flash",
    icon: Google,
  },
  {
    name: "Llama 3 8b",
    value: "llama-3-8b",
    icon: Meta,
  },
  {
    name: "Firefunction V2",
    value: "firefunction-v2",
    icon: Fireworks,
  },
  {
    name: "Mistral 7b",
    value: "mistral-7b",
    icon: Mistral,
  },
];
export const ModelPicker: FC = () => {
  return (
    <Select defaultValue={models[0]?.value ?? ""}>
      <SelectTrigger className="max-w-[300px]">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent className="">
        {models.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            <span className="flex items-center gap-2">
              <model.icon className="inline size-4" />
              <span>{model.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
