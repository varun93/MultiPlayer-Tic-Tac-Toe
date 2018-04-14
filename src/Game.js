import React from "react";
import PubNub from "pubnub-react";
import Board from "./Board";
import "./App.css";
import { calculateWinner } from "./utils";
const CHANNEL = "tic_tac_toe";

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      history: [
        {
          squares: Array(9).fill(null)
        }
      ],
      player: null,
      stepNumber: 0,
      lastMovedBy: null
    };

    this.pubnub = new PubNub({
      publishKey: process.env.REACT_APP_PUB_PUBLISH_KEY,
      subscribeKey: process.env.REACT_APP_PUB_SUBSCRIBE_KEY
    });
    this.pubnub.init(this);
  }

  sendMessage = message => {
    this.pubnub.publish({
      message,
      channel: CHANNEL
    });
  };

  componentWillMount() {
    this.pubnub.subscribe({ channels: [CHANNEL] });
  }

  componentDidMount() {
    const { connectedToNetwork } = this.state;

    this.pubnub.getMessage(CHANNEL, message => {
      this.messageReceived(message);
    });
  }

  componentWillUnmount() {
    this.pubnub.unsubscribe({ channels: [CHANNEL] });
  }

  messageReceived = message => {
    const { type, stepNumber, player, moveCordinate } = message.message;

    if (type === "jump") {
      this.setState({
        lastMovedBy: stepNumber % 2 === 0 ? "O" : "X",
        stepNumber
      });
    } else {
      const history = this.state.history.slice(0, this.state.stepNumber + 1);
      const current = history[history.length - 1];
      const squares = current.squares.slice();
      // if the player has already won; or the square has already been occupied.
      if (calculateWinner(squares) || squares[moveCordinate]) {
        return;
      }
      // store the move
      squares[moveCordinate] = player;

      this.setState({
        history: history.concat([
          {
            squares: squares
          }
        ]),
        stepNumber: history.length,
        player: this.state.player === null ? "O" : this.state.player,
        lastMovedBy: player
      });
    }
  };

  handleClick(moveCordinate) {
    const { player, lastMovedBy } = this.state;

    if (player && player === lastMovedBy) {
      return;
    }

    const message = {
      type: "move",
      moveCordinate,
      player: player || "X"
    };

    this.setState({ player: player || "X" });
    this.sendMessage(message);
  }

  jumpTo(step) {
    if (this.state.player === null) {
      return;
    }
    this.sendMessage({ type: "jump", stepNumber: step });
  }

  render() {
    const history = this.state.history;
    const current = history[this.state.stepNumber];
    const winner = calculateWinner(current.squares);
    const moves = history.map((step, move) => {
      const desc = move ? "Go to move #" + move : "Go to game start";
      return (
        <li key={move}>
          <button onClick={() => this.jumpTo(move)}>{desc}</button>
        </li>
      );
    });

    let status;
    if (winner) {
      status = "Winner: " + winner;
    } else {
      status = "Next player: " + (this.state.lastMovedBy === "X" ? "O" : "X");
    }

    return (
      <div className="game">
        <div className="game-board">
          <Board squares={current.squares} onClick={i => this.handleClick(i)} />
        </div>
        <div className="game-info">
          <div>{status}</div>
          <ol>{moves}</ol>
        </div>
      </div>
    );
  }
}

export default Game;
