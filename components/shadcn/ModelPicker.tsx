"use client";
import * as React from "react";
import {
  CaretSortIcon,
  CheckIcon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Anthropic from "@/assets/providers/anthropic.svg";
import Fireworks from "@/assets/providers/fireworks.svg";
import Google from "@/assets/providers/google.svg";
import Deepseek from "@/assets/providers/deepseek.svg";
import Meta from "@/assets/providers/meta.svg";
import Mistral from "@/assets/providers/mistral.svg";
import OpenAI from "@/assets/providers/openai.svg";

const groups = [
  {
    label: "Personal Account",
    teams: [
      {
        label: "Alicia Koch",
        value: "personal",
      },
    ],
  },
  {
    label: "Teams",
    teams: [
      {
        label: "Acme Inc.",
        value: "acme-inc",
      },
      {
        label: "Monsters Inc.",
        value: "monsters-inc",
      },
    ],
  },
];

const models = [
  {
    provider: "openai",
    name: "OpenAI",
    icon: OpenAI,
    models: [
      "gpt-4-turbo",
      "gpt-4o",
      "gpt-3.5-turbo",
      "gpt-4-vision-preview",
      "gpt-4-turbo-preview",
    ],
  },
  {
    provider: "anthropic",
    name: "Anthropic",
    icon: Anthropic,
    models: [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
      "claude-2.1",
      "claude-2.0",
      "claude-instant-1.2",
    ],
  },
  {
    provider: "google",
    name: "Google",
    icon: Google,
    models: [
      "gemini-1.5-pro-latest",
      "gemini-pro-1.0",
      "gemini-pro-vision-1.0",
    ],
  },
  {
    provider: "fireworks",
    name: "Fireworks",
    icon: Fireworks,
    models: ["accounts/fireworks/models/firefunction-v1"],
  },
  {
    provider: "mistral",
    name: "Mistral",
    icon: Mistral,
    models: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "open-mistral-7b",
      "open-mixtral-8x7b",
    ],
  },
  {
    provider: "deepseek",
    name: "Deepseek",
    icon: Deepseek,
    models: ["deepseek-chat", "deepseek-coder"],
  },
  {
    provider: "meta",
    name: "Meta",
    icon: Meta,
    models: ["llama3-70b-8192", "llama3-8b-8192"],
  },
];

type Team = (typeof groups)[number]["teams"][number];

type Model = (typeof models)[number];

export default function ModelPicker() {
  const [open, setOpen] = React.useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<Team>(
    groups[0].teams[0],
  );
  const [selectedModel, setSelectedModel] = React.useState<Model>(models[0]);
  const [selectedSubModel, setSelectedSubModel] = React.useState<string>(
    models[0].models[0],
  );

  return (
    <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
      <div className="grid grid-cols-2 gap-x-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label="Select a team"
              className="w-full justify-between"
            >
              {selectedTeam.label}
              <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandList>
                <CommandInput placeholder="Search team..." />
                <CommandEmpty>No team found.</CommandEmpty>
                {groups.map((group) => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.teams.map((team) => (
                      <CommandItem
                        key={team.value}
                        onSelect={() => {
                          setSelectedTeam(team);
                          setOpen(false);
                        }}
                        className="text-sm"
                      >
                        {team.label}
                        <CheckIcon
                          className={cn(
                            "ml-auto h-4 w-4",
                            selectedTeam.value === team.value
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
              <CommandSeparator />
              <CommandList>
                <CommandGroup>
                  <DialogTrigger asChild>
                    <CommandItem
                      onSelect={() => {
                        setOpen(false);
                        setShowNewTeamDialog(true);
                      }}
                    >
                      <PlusCircledIcon className="mr-2 h-5 w-5" />
                      Create Team
                    </CommandItem>
                  </DialogTrigger>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Select
          value={selectedModel.provider}
          onValueChange={(provider: string) => {
            const model = models.find((m) => m.provider === provider);
            if (model) {
              setSelectedModel(model);
              setSelectedSubModel(model.models[0]);
            }
          }}
        >
          <SelectTrigger className="w-full" aria-label="Select a model provider">
            <div className="flex items-center gap-x-2">
              <selectedModel.icon className="h-5 w-5" />
              <SelectValue placeholder="Select a model" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.provider} value={model.provider}>
                <div className="flex items-center gap-x-2">
                  <model.icon className="h-5 w-5" />
                  <span>{model.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-2">
        <Select
          value={selectedSubModel}
          onValueChange={(value: string) => {
            setSelectedSubModel(value);
          }}
        >
          <SelectTrigger className="w-full" aria-label="Select a model">
            <SelectValue placeholder="Select a sub-model" />
          </SelectTrigger>
          <SelectContent>
            {selectedModel.models.map((subModel) => (
              <SelectItem key={subModel} value={subModel}>
                {subModel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>
            Add a new team to manage products and customers.
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team name</Label>
              <Input id="name" placeholder="Acme Inc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Subscription plan</Label>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Select>
                <SelectTrigger aria-label="Select a subscription plan">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <span className="font-medium">Free</span> -{" "}
                    <span className="text-muted-foreground">
                      Trial for two weeks
                    </span>
                  </SelectItem>
                  <SelectItem value="pro">
                    <span className="font-medium">Pro</span> -{" "}
                    <span className="text-muted-foreground">
                      $9/month per user
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowNewTeamDialog(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={() => {
              setShowNewTeamDialog(false);
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 