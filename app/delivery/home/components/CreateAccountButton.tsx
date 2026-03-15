"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { FaGoogle } from "react-icons/fa";
import {
  MdClose,
  MdLockOutline,
  MdMailOutline,
  MdPersonOutline,
  MdPhoneIphone,
} from "react-icons/md";

type CreateAccountButtonProps = {
  className?: string;
  label?: string;
};

export default function CreateAccountButton({
  className,
  label = "Criar conta",
}: CreateAccountButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const buttonClassName =
    className ??
    "rounded-full bg-[#ea1d2c] px-3 py-1.5 font-semibold text-white transition hover:bg-[#c81422]";

  const closeModal = () => {
    setIsOpen(false);
    setIsCreated(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreated(true);
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={closeModal}
        aria-label="Fechar modal"
        className="absolute inset-0 cursor-pointer bg-zinc-950/72 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-account-title"
        className="relative w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 shadow-2xl ring-1 ring-black/5"
      >
        <button
          type="button"
          onClick={closeModal}
          aria-label="Fechar"
          className="absolute right-3 top-3 cursor-pointer rounded-full p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          <MdClose className="h-5 w-5" />
        </button>

        <h3
          id="create-account-title"
          className="text-2xl font-black leading-tight text-zinc-900"
        >
          Crie sua conta
        </h3>
        <p className="mt-2 text-sm text-zinc-600">
          Cadastre-se e aproveite cupons e entregas mais rápidas.
        </p>

        {!isCreated ? (
          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <button
              type="button"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              <FaGoogle className="h-4 w-4 text-[#ea4335]" />
              Entrar com Google
            </button>

            <div className="relative py-1">
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-zinc-200" />
              <span className="relative mx-auto block w-fit bg-white px-2 text-xs text-zinc-500">
                ou cadastre com e-mail
              </span>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
              <MdPersonOutline className="h-5 w-5 text-zinc-400" />
              <input
                required
                type="text"
                placeholder="Nome completo"
                className="w-full border-none text-sm text-zinc-900 outline-none"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
              <MdMailOutline className="h-5 w-5 text-zinc-400" />
              <input
                required
                type="email"
                placeholder="E-mail"
                className="w-full border-none text-sm text-zinc-900 outline-none"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
              <MdPhoneIphone className="h-5 w-5 text-zinc-400" />
              <input
                required
                type="tel"
                placeholder="Telefone"
                className="w-full border-none text-sm text-zinc-900 outline-none"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
              <MdLockOutline className="h-5 w-5 text-zinc-400" />
              <input
                required
                type="password"
                placeholder="Senha"
                className="w-full border-none text-sm text-zinc-900 outline-none"
              />
            </label>

            <button
              type="submit"
              className="mt-2 inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[#ea1d2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c81422]"
            >
              Criar minha conta
            </button>
          </form>
        ) : (
          <div className="mt-5 space-y-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Conta criada com sucesso.
            </p>
            <p className="text-sm text-zinc-700">
              Agora você já pode fazer seu primeiro pedido e aproveitar os
              descontos.
            </p>
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[#ea1d2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c81422]"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${buttonClassName} cursor-pointer`}
      >
        {label}
      </button>
      {typeof document !== "undefined" && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
