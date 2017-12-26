import React, { Component } from 'react'
import { Card, Input, Layout, LocaleProvider, Select, Tabs } from 'antd'
import enUS from 'antd/lib/locale-provider/en_US'
import socket from '../socket'
import EventCard from './event-card'
import tabSpec from './tab-spec'

const { Header, Content } = Layout
const { Search } = Input
const { TabPane } = Tabs
const { Option } = Select

export default class Esm extends Component {
  state = {
    events: {},
    channel: null,
    search: '',
    state: null,
    calendars: [],
    tabActiveKey: tabSpec[0].title,
    typeOptions: []
  }

  setSearch = value => this.setState({ search: value })
  setStateFilter = state => this.setState({ state })
  setCalendarFilter = calendars => this.setState({ calendars })
  onTabChange = newActiveKey => {
    return newActiveKey != 'Interest Form'
      ? this.setState({ tabActiveKey: newActiveKey })
      : window.open(
          'https://docs.google.com/spreadsheets/d/1zi3D0MWlGuWerm0yiA6vuB389fXOGWfZZoEsx-0SdL8/edit?ts=5a3faeb3#gid=1609788758'
        )
  }

  filteredEvents = () =>
    Object.keys(this.state.events).filter(e => {
      const event = this.state.events[e]

      const searchOk =
        this.state.search != ''
          ? (event.name &&
              event.name
                .toLowerCase()
                .includes(this.state.search.toLowerCase())) ||
            (event.description &&
              event.description
                .toLowerCase()
                .includes(this.state.search.toLowerCase()))
          : true

      const stateOk =
        this.state.state == null || this.state.state.trim() == ''
          ? true
          : event.location.region == this.state.state

      const calendarOk =
        this.state.calendars.length == 0
          ? true
          : this.state.calendars.filter(c =>
              event.tags
                .map(t => t.toLowerCase())
                .includes(`Calendar: ${c}`.toLowerCase())
            ).length > 0

      return searchOk && stateOk && calendarOk
    })

  countEventsFor = fn =>
    this.filteredEvents().filter(e => fn(this.state.events[e])).length

  eventsFor = (fn, category) =>
    this.filteredEvents()
      .filter(e => fn(this.state.events[e], true))
      .sort(
        (a, b) =>
          new Date(this.state.events[a].start_date) -
          new Date(this.state.events[b].start_date)
      )
      .map(id => (
        <EventCard
          typeOptions={this.state.typeOptions}
          key={id}
          event={this.state.events[id]}
          id={id}
          channel={this.state.channel}
          category={category}
        />
      ))

  componentWillMount() {
    window.tagOptions = []
  }

  componentDidMount() {
    const token = document
      .querySelector('#guardian_token')
      .getAttribute('content')

    this.state.channel = socket.channel('events', { guardian_token: token })

    this.state.channel
      .join()
      .receive('ok', resp => {
        console.log('Joined successfully', resp)
      })
      .receive('error', resp => {
        console.log('Unable to join', resp)
      })

    this.state.channel.on('event', ({ id, event }) => {
      const newEvents = Object.assign({}, this.state.events, { [id]: event })
      event.tags.forEach(t => window.tagOptions.push(t))
      this.state.events[id] = event
      const typeOptions = [
        ...new Set(this.state.typeOptions.concat([event.type]))
      ]
      this.forceUpdate()
    })

    this.state.channel.on('checkout', ({ id, actor }) => {
      this.state.events[id].checked_out_by = actor
      this.forceUpdate()
    })

    this.state.channel.on('checkin', ({ id }) => {
      this.state.events[id].checked_out_by = undefined
      this.forceUpdate()
    })

    this.state.channel.push('ready', { page: 'esm' })
  }

  render() {
    return (
      <LocaleProvider locale={enUS}>
        <Layout style={{ width: '100%', height: '100%' }}>
          <Header>
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around'
              }}>
              <h1 style={{ color: 'white', textTransform: 'capitalize' }}>
                Welcome {window.userEmail.split('@')[0]}!
              </h1>
              <span style={{color: 'white'}}>
                Please allow up to 20 seconds for all events to load, and
                refresh to see new events that may have been created
              </span>
              <Search
                placeholder="Search title and description"
                style={{ width: 200 }}
                onSearch={this.setSearch}
              />

              {/* <Select
                style={{
                  width: 300,
                  float: 'right',
                  marginTop: 'auto',
                  marginBottom: 'auto'
                }}
                mode="multiple"
                defaultValue={[]}
                onChange={this.setCalendarFilter}
                placeholder="Calendar Filter"
                filterOption={(input, option) =>
                  option.props.children
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }>
                {window.calendarOptions
                  .sort()
                  .map(c => <Option value={c.toLowerCase()}>{c}</Option>)}
              </Select> */}

              <Select
                onChange={this.setStateFilter}
                placeholder="State Filter"
                style={{ width: 200 }}>
                <Option value="">All States</Option>
                {window.states.map(st => <Option value={st}>{st}</Option>)}
              </Select>
            </div>
          </Header>
          <Content style={{ height: '100%' }}>
            <Tabs
              onTabClick={this.onTabChange}
              defaultActiveKey="Needs Approval">
              {tabSpec.map(({ title, fn }) => (
                <TabPane
                  tab={
                    title == 'Interest Form'
                      ? title
                      : title + ` (${this.countEventsFor(fn)})`
                  }
                  key={title}>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {this.eventsFor(fn, title)}
                  </div>
                </TabPane>
              ))}
            </Tabs>
          </Content>
        </Layout>
      </LocaleProvider>
    )
  }
}
