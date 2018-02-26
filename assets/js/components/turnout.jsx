import React, { Component } from "react";
import {
  Button,
  Icon,
  Input,
  InputNumber,
  Modal,
  Table,
  Spin,
  Switch,
  message
} from "antd";

const booleanize = val =>
  val === undefined ? false : val.toLowerCase() == "yes";
const debooleanize = val =>
  val === true || val === false ? (val ? "yes" : "no") : val;

export default class Turnout extends Component {
  state = {
    survey: "unloaded",
    changes: {},
    open: false,
    loading: false
  };

  componentWillReceiveProps(nextProps) {
    this.state.loading = false;
    this.state.survey = nextProps.survey;

    if (Object.keys(this.state.changes).length > 0) {
      message.success("Your turnout request was successfully updated");
      this.state.changes = {};
    }
  }

  loadTurnoutRequest = () => {
    this.props.channel.push(`turnout-survey-for-${this.props.event_id}`);
    this.setState({ open: true, loading: true });
  };

  close = () => {
    this.setState({ open: false, loading: false });
  };

  setSurveyBool = attr => val =>
    this.setState(prevState => ({
      changes: Object.assign(prevState.changes, { [attr]: debooleanize(val) }),
      survey: Object.assign(prevState.survey, { [attr]: debooleanize(val) })
    }));

  setSurveyReg = attr => val =>
    this.setState(prevState => ({
      changes: Object.assign(prevState.changes, { [attr]: val }),
      survey: Object.assign(prevState.survey, { [attr]: val })
    }));

  setSurveyRegInput = attr => ev => {
    this.setState({
      changes: Object.assign(this.state.changes, { [attr]: ev.target.value }),
      survey: Object.assign(this.state.survey, { [attr]: ev.target.value })
    });
  };

  saveChanges = () => {
    this.props.channel.push(
      `edit-turnout-survey-for-${this.props.event_id}`,
      this.state.changes
    );

    this.setState({ loading: true });
  };

  render() {
    if (!this.state.open) {
      return (
        <Button type="primary" onClick={this.loadTurnoutRequest}>
          My Turnout Request
        </Button>
      );
    } else if (this.state.survey === null) {
      return (
        <Modal
          title="We don't have a turnout request on file for you yet!"
          okText="Submit a Turnout Request"
          visible={true}
          onOk={() =>
            window.open(
              `https://go.justicedemocrats.com/survey/event-turnout-request/?event_id=${
                this.props.event_id
              }`
            )
          }
          onCancel={this.close}
        >
          Please submit an initial request. After you do so, you will be able to
          view and edit it here.
          <br />
          <br />
          If you believe this is a mistake, and that you have already submitted
          a request, please contact ben@justicedemocrats.com.
        </Modal>
      );
    } else {
      return (
        <Modal
          visible={true}
          okText="Update My Turnout Request"
          cancelText="Disacrd Changes"
          onCancel={this.close}
          title="Edit Your Turnout Request"
          onOk={this.saveChanges}
        >
          {this.state.loading ? (
            <Spin
              style={{
                height: "100%",
                position: "absolute",
                top: "50%",
                left: "50%"
              }}
              size="large"
            />
          ) : (
            this.renderTurnoutOptions()
          )}
        </Modal>
      );
    }
  }

  renderTurnoutOptions() {
    return (
      <div>
        {[
          { toggle: "help_requested", name: "Host Walk Through", options: {} },
          {
            toggle: "need_turf_cut",
            name: "Turf Cutting Requested",
            options: {
              turf_count: { type: "number", label: "Turf count" },
              turf_instructions: {
                type: "string",
                label: "Turf instructions"
              }
            }
          },
          {
            toggle: "text_our_list",
            name: "Text JD List",
            options: {
              text_our_list_max: {
                type: "number",
                label: "Maximum number of people to text on our list?"
              }
            }
          },
          {
            toggle: "text_their_list",
            name: "Text Your List",
            options: {
              text_their_list_instructions: {
                type: "string",
                label: "Instructions to your list"
              }
            }
          },
          {
            toggle: "turnout_calls_our_list",
            name: "Turnout Calls JD List Requested",
            options: {}
          }
        ].map(section => this.renderSection(section))}
      </div>
    );
  }

  renderSection(section) {
    return (
      <div style={{ padding: 10 }}>
        <Switch
          checked={booleanize(this.state.survey[section.toggle])}
          onChange={this.setSurveyBool(section.toggle)}
        />
        <label> {section.name}? </label>
        {booleanize(this.state.survey[section.toggle]) && (
          <div>
            {Object.keys(section.options).length > 0 && (
              <h4> {section.name} Options </h4>
            )}
            {Object.keys(section.options).map(opt_key => (
              <div>
                <label> {section.options[opt_key].label} </label> <br />
                {section.options[opt_key].type == "string" ? (
                  <Input
                    value={this.state.survey[opt_key]}
                    onChange={this.setSurveyRegInput(opt_key)}
                  />
                ) : (
                  <InputNumber
                    step={opt_key == "turf_count" ? 1 : 10}
                    min={0}
                    value={this.state.survey[opt_key]}
                    onChange={this.setSurveyReg(opt_key)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}
