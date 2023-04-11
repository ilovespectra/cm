import type { NextPage } from "next";
import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/Home.module.css";
import {
  CandyMachine,
  Metaplex,
  walletAdapterIdentity,
  PublicKey,
  guestIdentity,
  FindNftsByOwnerOutput,
} from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { guardChecker, GuardReturn } from "../utils/checker";
import { ButtonList } from "../components/mintbutton";
import { Button, Card, Loading, Row } from "@nextui-org/react";
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const Home: NextPage = () => {
  const wallet = useWallet();
  const connectionProvider = useConnection();

  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [availableMints, setAvailableMints] = useState<Number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [ownedNfts, setOwnedNfts] = useState<FindNftsByOwnerOutput>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: "default", allowed: false },
  ]);

  const metaplex = useMemo(() => {
    if (wallet.publicKey === null) {
      return Metaplex.make(connectionProvider.connection).use(guestIdentity());
    } else {
      return Metaplex.make(connectionProvider.connection).use(
        walletAdapterIdentity(wallet)
      );
    }
  }, [connectionProvider.connection, wallet]);

  const candyMachineId = useMemo(() => {
    if (process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      return new PublicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
    } else {
      console.error(`NO CANDY MACHINE IN .env FILE DEFINED!`);
      return new PublicKey("Dummy that will crash hard");
    }
  }, []);

  //call manually on page load
  const fetchCandymachine = useCallback(async () => {
    setIsLoading(true);
    const candyMachine = await metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineId });

    setCandyMachine(candyMachine);
    setIsLoading(false);
  }, [metaplex, candyMachineId]);

  useEffect(() => {
    if (!metaplex) {
      return;
    }
    fetchCandymachine();
  }, [metaplex, fetchCandymachine]);

  const checkWalletLegibility = useCallback(async () => {
    if (candyMachine === undefined || !candyMachine.candyGuard) {
      return;
    }

    const { guardReturn, ownedNfts } = await guardChecker(
      metaplex,
      candyMachine
    );
    setOwnedNfts(ownedNfts);
    setGuards(guardReturn);
    setIsAllowed(false);
    let allowed = false;
    for (const guard of guardReturn) {
      if (guard.allowed) {
        allowed = true;
      }
    }
    if (allowed === true) {
      setIsAllowed(true);
    } else {
      setIsAllowed(false);
    }
  }, [metaplex, candyMachine]);

  useEffect(() => {
    (async () => {
      await checkWalletLegibility();
    })();
  }, [candyMachine, checkWalletLegibility]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <WalletMultiButtonDynamic style={{ float: "right" }} />

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to{" "}
          <a style={{ color: "#fff" }} href="https://nextjs.org">
            Solana Next.js!
          </a>
        </h1>

        <p className={styles.description}>
          available NFTs
          <code className={styles.code}>{availableMints.toString()}</code>
        </p>
        <Card css={{ mw: "400px" }}>
          <Card.Header>A basic card</Card.Header>
          <Card.Divider />
          {isLoading ? (
            <Loading />
          ) : (
            <ButtonList
              guardList={guards}
              candyMachine={candyMachine}
              metaplex={metaplex}
              ownedNfts={ownedNfts}
            />
          )}
          <Card.Footer>
            <Row justify="flex-end">
              <Button size="sm" light>
                Cancel
              </Button>
              <Button size="sm">Agree</Button>
            </Row>
          </Card.Footer>
        </Card>
      </main>
    </div>
  );
};

export default Home;