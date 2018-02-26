import React, { Component } from "react";
import { Input, Icon, Select, Button } from "antd";
import moment from "moment";

const { Option } = Select;

export default class Sort extends Component {
  state = {
    value: "created_date",
    direction: 1
  };

  setValue = value => this.setState({ value }, this.setSortFn);
  setDirection = direction => this.setState({ direction }, this.setSortFn);

  setSortFn = () => {
    this.props.setSortFn((a, b) => {
      if (this.state.direction == 1) {
        return a[this.state.value] <= b[this.state.value] ? -1 : 1;
      } else {
        return a[this.state.value] <= b[this.state.value] ? 1 : -1;
      }
    });
  };

  render() {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 3,
          height: "75%",
          position: "relative"
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "larger",
            textTransform: "uppercase",
            padding: 3
          }}
        >
          Sort By
        </span>

        <Select
          value={this.state.value}
          style={{ width: 120 }}
          onChange={this.setValue}
        >
          {Object.keys(this.props.filterSpec).map(key => (
            <Option value={key}>{this.props.filterSpec[key].display}</Option>
          ))}
        </Select>

        <Select
          value={this.state.direction}
          style={{ width: 50 }}
          onChange={this.setDirection}
        >
          <Option value={1}>
            <Icon type="caret-up" />{" "}
          </Option>
          <Option value={-1}>
            <Icon type="caret-down" />{" "}
          </Option>
        </Select>
      </div>
    );
  }
}
